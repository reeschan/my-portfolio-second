import { withBearerAuth } from "@/decorator/with-bearer-auth"
import { withErrorHandling } from "@/decorator/with-error-handling"
import { withSlackNotify } from "@/decorator/with-slack-notify"
import { HttpError } from "@/lib/api/errors"
import { nowWriteAuth, nowWriteErrors } from "@/lib/now/auth"
import { revalidateNowPosts } from "@/lib/now/cached"
import { getNowImageStore, requireNowImageStore } from "@/lib/now/image-store"
import { planImagesOrThrow, putPlannedImages, readNowPostInput, removeImagesQuietly, withImages } from "@/lib/now/input"
import { nowPostNotification } from "@/lib/now/notify"
import type { NowPost } from "@/lib/now/schema"
import { requireNowStore } from "@/lib/now/store"

// /now は記事を作り置きから読む (lib/now/cached.ts)。書き込みが成功したら、応答を返す前に作り置きを捨てる

type Context = { params: Promise<{ id: string }> }

const notFound = () => new HttpError(404, "投稿が見つかりません。")

// /now の記事を 1 件書き換える。本文は POST と同じ形で、題名と本文はまるごと置き換える
// publishedAt を省略したら元の公開日時のまま (並び順を変えずに誤字を直せるように)
// 画像は、今回送ったもの → 元の記事の対応表の順に探す。送らなければ (JSON でも) 元の対応表から引き継ぎ、本文から外した画像は対応表と置き場から消す
// 更新できたら Slack に知らせる (SLACK_WEBHOOK_URL を設定したときだけ)
export const PUT = withErrorHandling(
  withSlackNotify(
    nowPostNotification("updated"),
    withBearerAuth(nowWriteAuth, async (request, ctx: Context) => {
      const store = requireNowStore()
      const { title, body, publishedAt, uploads } = await readNowPostInput(request)
      const { id } = await ctx.params

      const current = await store.get(id)
      if (!current) throw notFound()

      const plan = planImagesOrThrow({ body, uploads, previous: current.images ?? [] })
      // 置き場が要るのは新しく画像を置くときだけ (引き継ぐだけなら、本番で置き場が無くても受け付ける)
      const imageStore = plan.puts.length > 0 ? requireNowImageStore() : getNowImageStore()
      const placed = imageStore && plan.puts.length > 0 ? await putPlannedImages(imageStore, id, plan.puts) : []

      const post: NowPost = withImages(
        {
          id,
          title,
          body,
          publishedAt: publishedAt ? new Date(publishedAt).toISOString() : current.publishedAt,
          updatedAt: new Date().toISOString(),
        },
        [...plan.kept, ...placed],
      )
      const label = `PUT /api/now/${id}`
      try {
        await store.save(post)
      } catch (error) {
        // 元の記事は今回置いた画像を参照しないので、消しにいく。エラーはそのまま返す
        await removeImagesQuietly(imageStore, placed, label)
        throw error
      }
      // 外れた画像は、記事の保存が成功してから消す (保存に失敗したときに元の記事の画像が消えていないように)
      await removeImagesQuietly(imageStore, plan.removed, label)
      // 直した記事が次の表示に出るよう、作り置きを捨てる。検証や保存に失敗したときは呼ばない
      revalidateNowPosts()
      return Response.json(post)
    }),
  ),
  nowWriteErrors,
)

// /now の記事を 1 件消す。記事を消したあとに、その記事の画像を置き場からまとめて消す
export const DELETE = withErrorHandling(
  withBearerAuth(nowWriteAuth, async (_request, ctx: Context) => {
    const store = requireNowStore()
    const { id } = await ctx.params
    if (!(await store.remove(id))) throw notFound()
    // 置き場が無ければ (本番でトークン無し) 画像も置かれていないので何もしない。消すのに失敗しても記事は消えたので 204 のまま、ログに残す
    await getNowImageStore()
      ?.removePost(id)
      .catch((error: unknown) => {
        console.error(`DELETE /api/now/${id}: 画像を消せませんでした`, error)
      })
    // 消した記事が一覧に残らないよう、作り置きを捨てる。見つからない (404) ときは呼ばない
    revalidateNowPosts()
    return new Response(null, { status: 204 })
  }),
  nowWriteErrors,
)
