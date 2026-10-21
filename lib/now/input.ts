import { HttpError } from "@/lib/api/errors"
import { readJsonBody } from "@/lib/api/request"
import { nowWriteErrors } from "./auth"
import type { NowImageStore } from "./image-store"
import { type ImageUpload, maxRequestBytes, type PlannedPut, planPostImages } from "./post-images"
import { nowPostInputSchema, type NowPostImage, type NowPostInput } from "./schema"

// 投稿 API が読む入力。uploads は multipart の images 欄で送られた画像 (JSON では常に空)
export type NowPostRequest = NowPostInput & { uploads: ImageUpload[] }

// POST /api/now と PUT /api/now/[id] の入力を読む (PBI-0015、画像は PBI-0024)
// - application/json: { title, body, publishedAt? } (今までどおり。画像は付けられない)
// - multipart/form-data: file に Markdown のファイル、title と publishedAt は任意のテキスト、images に画像 (同じ名前で何度でも)
//   Postman などで .md を選んでそのまま投稿できるようにする。JSON に詰め直す手間 (jq など) をなくす
export async function readNowPostInput(request: Request): Promise<NowPostRequest> {
  // 本文を読む前に断る (大きなリクエストをメモリに読み込まないため。Vercel の関数の上限にも収める)
  if (Number(request.headers.get("content-length") ?? 0) > maxRequestBytes) throw new HttpError(413, "リクエストが大きすぎます。")
  if (!isMultipart(request)) return { ...(await readJsonBody(request, nowPostInputSchema, nowWriteErrors.invalid)), uploads: [] }

  const form = await request.formData().catch(() => {
    throw invalid("フォームを読めませんでした。")
  })
  const file = form.get("file")
  if (!(file instanceof File)) throw invalid("file に Markdown のファイルを指定してください。")
  const images = form.getAll("images")
  if (!images.every((image) => image instanceof File)) throw invalid("images には画像のファイルを指定してください。")

  const { title, body } = splitTitle(await file.text(), textField(form, "title"), file.name)
  const parsed = nowPostInputSchema.safeParse({ title, body, publishedAt: textField(form, "publishedAt") })
  if (!parsed.success) throw new HttpError(400, nowWriteErrors.invalid, { details: { issues: parsed.error.issues } })
  const uploads = await Promise.all(images.map(async (image) => ({ name: image.name, bytes: new Uint8Array(await image.arrayBuffer()) })))
  return { ...parsed.data, uploads }
}

function isMultipart(request: Request): boolean {
  return (request.headers.get("content-type") ?? "").toLowerCase().startsWith("multipart/form-data")
}

function invalid(reason: string): HttpError {
  return new HttpError(400, nowWriteErrors.invalid, { details: { reason } })
}

// 空欄のテキストは「指定なし」として扱う (Postman で行を残したまま値を消しても通るように)
function textField(form: FormData, name: string): string | undefined {
  const value = form.get(name)
  return typeof value === "string" && value.trim() !== "" ? value : undefined
}

// 題名の決め方: title 欄 → 本文の先頭の「# 見出し」→ ファイル名 (拡張子なし) の順
// 先頭の見出しを題名にしたときは、本文から外す (ダイアログの題と本文の見出しが二重に出ないように)
export function splitTitle(markdown: string, title: string | undefined, fileName: string): { title: string; body: string } {
  const text = markdown.replace(/^\uFEFF/, "")
  if (title) return { title, body: text }

  const heading = /^\s*# +(.+?)(?:[ \t]+#+)?[ \t]*(?:\r?\n|$)/.exec(text)
  if (heading?.[1]) return { title: heading[1], body: text.slice(heading[0].length) }

  return { title: fileName.replace(/\.(md|markdown)$/i, ""), body: text }
}

// ---- 画像の扱い (POST と PUT の両方の route が使う。route のファイルは HTTP メソッドなど決まった名前しか export できないので、ここに置く) ----

// 本文と送られた画像と元の対応表から計画を立てる。受け付けないときは 400 で、何が悪いかを details.issues に入れる
export function planImagesOrThrow(input: { body: string; uploads: ImageUpload[]; previous: NowPostImage[] }) {
  const plan = planPostImages(input)
  if (!plan.ok) throw new HttpError(400, nowWriteErrors.invalid, { details: { issues: plan.issues } })
  return plan
}

// 計画の画像を並列に置き、対応表の形で返す。1 枚でも失敗したら、置けた分を消しにいってから最初の失敗を投げる
// (どの記事からも参照されない画像を置き場に残さないため)
export async function putPlannedImages(store: NowImageStore, postId: string, puts: PlannedPut[]): Promise<NowPostImage[]> {
  const results = await Promise.allSettled(
    puts.map(async ({ name, bytes, sha256, contentType, width, height }): Promise<NowPostImage> => {
      const { url } = await store.put({ postId, name, sha256, bytes, contentType })
      return { name, url, width, height, contentType, bytes: bytes.length, sha256 }
    }),
  )
  const placed = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []))
  const failure = results.find((result) => result.status === "rejected")
  if (failure) {
    await removeImagesQuietly(store, placed, "置けた画像の後始末")
    throw failure.reason
  }
  return placed
}

// 画像を消す。失敗してもレスポンスは変えず、サーバーのログに残すだけにする
// (呼ぶのは記事の保存・削除が済んだあとか、元のエラーをそのまま返すときなので、消す失敗で結果を変えない)
export async function removeImagesQuietly(store: NowImageStore | null, images: NowPostImage[], label: string): Promise<void> {
  if (images.length === 0) return
  if (!store) {
    console.error(
      `${label}: 画像の置き場が設定されていないので消せませんでした`,
      images.map((image) => image.url),
    )
    return
  }
  await store.removeUrls(images.map((image) => image.url)).catch((error: unknown) => {
    console.error(`${label}: 画像を消せませんでした`, error)
  })
}

// 記事に付ける対応表。空なら項目ごと付けない (画像の無い記事は今までと同じ形にする)
export function withImages<T extends object>(post: T, images: NowPostImage[]): T & { images?: NowPostImage[] } {
  return images.length > 0 ? { ...post, images } : post
}
