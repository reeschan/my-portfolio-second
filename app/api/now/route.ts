import { withBearerAuth } from "@/decorator/with-bearer-auth"
import { withErrorHandling } from "@/decorator/with-error-handling"
import { readJsonBody } from "@/lib/api/request"
import { nowWriteAuth, nowWriteErrors } from "@/lib/now/auth"
import { nowPostInputSchema, type NowPost } from "@/lib/now/schema"
import { requireNowStore } from "@/lib/now/store"

export const runtime = "nodejs"
// /now は毎リクエスト保存先から読む (app/now/page.tsx) ので、書き込み後のキャッシュの破棄は要らない

// /now に記事を 1 件足す。Authorization: Bearer <NOW_POST_TOKEN> が必要
// 本文: { "title": "...", "body": "Markdown", "publishedAt"?: "2026-10-09T12:00:00+09:00" }
export const POST = withErrorHandling(
  withBearerAuth(nowWriteAuth, async (request) => {
    const store = requireNowStore()
    const { title, body, publishedAt } = await readJsonBody(request, nowPostInputSchema, nowWriteErrors.invalid)

    const post: NowPost = {
      id: crypto.randomUUID(),
      title,
      body,
      publishedAt: new Date(publishedAt ?? Date.now()).toISOString(),
    }
    await store.save(post)
    return Response.json(post, { status: 201, headers: { Location: `/api/now/${post.id}` } })
  }),
  nowWriteErrors,
)
