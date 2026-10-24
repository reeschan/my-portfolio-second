import { withBearerAuth } from "@/decorator/with-bearer-auth"
import { withErrorHandling } from "@/decorator/with-error-handling"
import { HttpError } from "@/lib/api/errors"
import { nowWriteAuth, nowWriteErrors } from "@/lib/now/auth"
import { revalidateNowPosts } from "@/lib/now/cached"
import { planImagesOrThrow, readNowEnglishInput } from "@/lib/now/input"
import type { NowPost } from "@/lib/now/schema"
import { requireNowStore } from "@/lib/now/store"

// 持ち主の訳は、書き込み先の記事の保存と作り置きの破棄を伴う。LLM は呼ばないが、ほかの書き込み API と上限をそろえる
export const maxDuration = 300

type Context = { params: Promise<{ id: string }> }

const notFound = () => new HttpError(404, "投稿が見つかりません。")

// 持ち主が書いた英語版を保存する (自動訳があれば置き換える)。本文は記事の投稿と同じ形で、題名と本文だけを受ける
// 画像は日本語の記事の対応表にあるものだけを参照できる。計画の kept・removed は使わない
// (日本語の本文が画像を使い続けるので、英語版では対応表を変えず、画像も消さない)
export const PUT = withErrorHandling(
  withBearerAuth(nowWriteAuth, async (request, ctx: Context) => {
    const store = requireNowStore()
    const { title, body } = await readNowEnglishInput(request)
    const { id } = await ctx.params

    const current = await store.get(id)
    if (!current) throw notFound()

    planImagesOrThrow({ body, uploads: [], previous: current.images ?? [] })

    const post: NowPost = { ...current, en: { title, body, source: "owner", updatedAt: new Date().toISOString() } }
    await store.save(post)
    // 保存した英語版が次の表示に出るよう、作り置きを捨てる。検証や保存に失敗したときは呼ばない
    revalidateNowPosts()
    return Response.json(post)
  }),
  nowWriteErrors,
)

// 英語版を外して日本語だけに戻す。英語版が無い記事でも 204、記事が無ければ 404
export const DELETE = withErrorHandling(
  withBearerAuth(nowWriteAuth, async (_request, ctx: Context) => {
    const store = requireNowStore()
    const { id } = await ctx.params

    const current = await store.get(id)
    if (!current) throw notFound()

    if (current.en) {
      const rest: NowPost = { ...current }
      delete rest.en
      await store.save(rest)
      revalidateNowPosts()
    }
    return new Response(null, { status: 204 })
  }),
  nowWriteErrors,
)
