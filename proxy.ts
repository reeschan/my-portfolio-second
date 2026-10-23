import { NextResponse, type NextRequest } from "next/server"
import { nowPostPath } from "@/lib/now/feed"
import { getNowStore, type NowPostStore } from "@/lib/now/store"

// /now の記事のページのパスの接頭辞。転送先は nowPostPath で作り、受け取ったパスからは id を取り出す
const nowPostPathPrefix = "/now/"

// どのルートにも当たらない固定のパス。知らない id の記事をここへ rewrite すると、Next.js が
// app/not-found.tsx の本文を 404 で返す。実在するページを指すとそのページが描かれてしまうので、
// わざと実在しないパスにする (docs/pbi/notes/now-404.md)
export const nowNotFoundPath = "/_now-post-not-found"

// proxy が決めた動き。NextRequest に依らない形にして、ユニットテストから確かめられるようにする
export type NowProxyDecision = { type: "next" } | { type: "redirect"; pathname: string } | { type: "rewrite"; pathname: string }

const nextDecision: NowProxyDecision = { type: "next" }
const notFoundDecision: NowProxyDecision = { type: "rewrite", pathname: nowNotFoundPath }

// /now と /now/<id> の状態コードを、ページがストリームを始める前に決める (ADR 0035)。
// Partial Prefetching では、params が未確定の殻が先に 200 で返るため、ページの中の
// permanentRedirect() と notFound() では状態コードを変えられない
export async function resolveNowProxy(
  pathname: string,
  searchParams: URLSearchParams,
  store: NowPostStore | null,
): Promise<NowProxyDecision> {
  if (pathname === "/now") return legacyNowLinkDecision(searchParams)

  const id = postIdOf(pathname)
  if (id === null) return nextDecision
  return (await postExists(store, id)) ? nextDecision : notFoundDecision
}

// 旧 RSS の item のリンク (/now?post=<id>) を記事のページへ 308 で転送する
function legacyNowLinkDecision(searchParams: URLSearchParams): NowProxyDecision {
  const post = searchParams.get("post")
  // post が 1 つでない (?post=a&post=b) ときは転送しない (今の typeof post === "string" と同じ扱い)
  if (post === null || searchParams.getAll("post").length !== 1) return nextDecision
  // 転送先に元のクエリを残さない。next.config.ts の redirects はクエリを残すので使わない (ADR 0035)
  return { type: "redirect", pathname: nowPostPath(post) }
}

// 記事があるかは、作り置きを使わず毎回保存先を読む。proxy は別のバンドルで、"use cache" の作り置きと共有できないため
async function postExists(store: NowPostStore | null, id: string): Promise<boolean> {
  // 保存先が無い (本番で Redis が未設定) なら、記事は存在しない
  if (!store) return false
  try {
    return (await store.get(id)) !== null
  } catch (error) {
    // 保存先が落ちているときに 404 を返すと、本物の記事まで見えなくなる。
    // 通して、ページ側に今までどおり 5xx を返させる
    console.error("Failed to check now post in proxy", error)
    return true
  }
}

// パスから記事の id を取り出す。記事の URL でなければ null
function postIdOf(pathname: string): string | null {
  if (!pathname.startsWith(nowPostPathPrefix)) return null
  const encoded = pathname.slice(nowPostPathPrefix.length)
  // 記事の id は 1 つのセグメント。余分な / を含むパスは記事の URL ではない
  if (!encoded || encoded.includes("/")) return null
  try {
    return decodeURIComponent(encoded)
  } catch {
    // % の後ろが壊れたパスは記事の id になり得ない。空の id は保存先に無い (nowPostSchema が min(1)) ので、
    // 知らない id と同じ 404 の rewrite になる
    return ""
  }
}

export async function proxy(request: NextRequest) {
  const decision = await resolveNowProxy(request.nextUrl.pathname, request.nextUrl.searchParams, getNowStore())
  if (decision.type === "redirect") return NextResponse.redirect(new URL(decision.pathname, request.url), 308)
  if (decision.type === "rewrite") return NextResponse.rewrite(new URL(decision.pathname, request.url))
  return NextResponse.next()
}

// /now と記事のページだけに当てる。ほかのページの応答を遅くしない
export const config = { matcher: ["/now", "/now/:id"] }
