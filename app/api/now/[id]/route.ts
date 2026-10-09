import { withBearerAuth } from "@/decorator/with-bearer-auth"
import { withErrorHandling } from "@/decorator/with-error-handling"
import { withSlackNotify } from "@/decorator/with-slack-notify"
import { HttpError } from "@/lib/api/errors"
import { readJsonBody } from "@/lib/api/request"
import { nowWriteAuth, nowWriteErrors } from "@/lib/now/auth"
import { nowPostNotification } from "@/lib/now/notify"
import { nowPostInputSchema, type NowPost } from "@/lib/now/schema"
import { requireNowStore } from "@/lib/now/store"

export const runtime = "nodejs"

type Context = { params: Promise<{ id: string }> }

const notFound = () => new HttpError(404, "投稿が見つかりません。")

// /now の記事を 1 件書き換える。本文は POST と同じ形で、題名と本文はまるごと置き換える
// publishedAt を省略したら元の公開日時のまま (並び順を変えずに誤字を直せるように)
// 更新できたら Slack に知らせる (SLACK_WEBHOOK_URL を設定したときだけ)
export const PUT = withErrorHandling(
  withSlackNotify(
    nowPostNotification("updated"),
    withBearerAuth(nowWriteAuth, async (request, ctx: Context) => {
      const store = requireNowStore()
      const { title, body, publishedAt } = await readJsonBody(request, nowPostInputSchema, nowWriteErrors.invalid)
      const { id } = await ctx.params

      const current = await store.get(id)
      if (!current) throw notFound()

      const post: NowPost = {
        id,
        title,
        body,
        publishedAt: publishedAt ? new Date(publishedAt).toISOString() : current.publishedAt,
        updatedAt: new Date().toISOString(),
      }
      await store.save(post)
      return Response.json(post)
    }),
  ),
  nowWriteErrors,
)

// /now の記事を 1 件消す
export const DELETE = withErrorHandling(
  withBearerAuth(nowWriteAuth, async (_request, ctx: Context) => {
    const store = requireNowStore()
    const { id } = await ctx.params
    if (!(await store.remove(id))) throw notFound()
    return new Response(null, { status: 204 })
  }),
  nowWriteErrors,
)
