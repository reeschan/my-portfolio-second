import { withBearerAuth } from "@/decorator/with-bearer-auth"
import { withErrorHandling } from "@/decorator/with-error-handling"
import { withSlackNotify } from "@/decorator/with-slack-notify"
import { nowWriteAuth, nowWriteErrors } from "@/lib/now/auth"
import { revalidateNowPosts } from "@/lib/now/cached"
import { requireNowImageStore } from "@/lib/now/image-store"
import { planImagesOrThrow, putPlannedImages, readNowPostInput, removeImagesQuietly, withImages } from "@/lib/now/input"
import { nowPostNotification } from "@/lib/now/notify"
import type { NowPost } from "@/lib/now/schema"
import { requireNowStore } from "@/lib/now/store"

// /now は記事を作り置きから読む (lib/now/cached.ts)。書き込みが成功したら、応答を返す前に作り置きを捨てる

// /now に記事を 1 件足す。Authorization: Bearer <NOW_POST_TOKEN> が必要
// 本文: { "title": "...", "body": "Markdown", "publishedAt"?: "2026-10-09T12:00:00+09:00" }
// または multipart/form-data で file (Markdown のファイル)、title・publishedAt (任意)、images (本文が参照する画像、何度でも) を送る (lib/now/input.ts)
// 順序は 検査 → 画像を置く → 記事を保存 (docs/specs/now-post-images.md)。保存できたら Slack に知らせる (SLACK_WEBHOOK_URL を設定したときだけ)
export const POST = withErrorHandling(
  withSlackNotify(
    nowPostNotification("created"),
    withBearerAuth(nowWriteAuth, async (request) => {
      const store = requireNowStore()
      const { title, body, publishedAt, uploads } = await readNowPostInput(request)
      const plan = planImagesOrThrow({ body, uploads, previous: [] })
      // 画像のパスに記事の id を使うので、画像を置く前に id を決める
      const id = crypto.randomUUID()
      // 置き場が要るのは画像を置くときだけ (画像の無い投稿は、本番で置き場が無くても今までどおり受け付ける)
      const imageStore = plan.puts.length > 0 ? requireNowImageStore() : null
      const placed = imageStore ? await putPlannedImages(imageStore, id, plan.puts) : []

      const post: NowPost = withImages({ id, title, body, publishedAt: new Date(publishedAt ?? Date.now()).toISOString() }, placed)
      try {
        await store.save(post)
      } catch (error) {
        // 記事が無いまま画像だけが残らないよう、置いた画像を消しにいく。エラーはそのまま返す
        await removeImagesQuietly(imageStore, placed, `POST /api/now (${id})`)
        throw error
      }
      // 保存できた記事が次の表示に出るよう、作り置きを捨てる。検証や保存に失敗したときは呼ばない
      revalidateNowPosts()
      return Response.json(post, { status: 201, headers: { Location: `/api/now/${post.id}` } })
    }),
  ),
  nowWriteErrors,
)
