import { withBearerAuth } from "@/decorator/with-bearer-auth"
import { nowWriteAuth } from "@/lib/now/auth"
import { invalidPostResponse, requireNowStore, storeFailedResponse } from "@/lib/now/responses"
import { nowPostInputSchema, type NowPost } from "@/lib/now/schema"

export const runtime = "nodejs"
// /now は毎リクエスト保存先から読む (app/now/page.tsx) ので、書き込み後のキャッシュの破棄は要らない

// /now に記事を 1 件足す。Authorization: Bearer <NOW_POST_TOKEN> が必要
// 本文: { "title": "...", "body": "Markdown", "publishedAt"?: "2026-10-09T12:00:00+09:00" }
export const POST = withBearerAuth(nowWriteAuth, async (request) => {
  const prepared = requireNowStore()
  if ("error" in prepared) return prepared.error

  const parsed = nowPostInputSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return invalidPostResponse(parsed.error.issues)

  const { title, body, publishedAt } = parsed.data
  const post: NowPost = {
    id: crypto.randomUUID(),
    title,
    body,
    publishedAt: new Date(publishedAt ?? Date.now()).toISOString(),
  }

  try {
    await prepared.store.save(post)
  } catch (error) {
    return storeFailedResponse("save", error)
  }
  return Response.json(post, { status: 201, headers: { Location: `/api/now/${post.id}` } })
})
