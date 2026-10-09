import { prepareNowWrite } from "@/lib/now/respond"
import { nowPostInputSchema, type NowPost } from "@/lib/now/schema"

export const runtime = "nodejs"
// /now は毎リクエスト保存先から読む (app/now/page.tsx) ので、書き込み後のキャッシュの破棄は要らない

// /now に記事を 1 件足す。Authorization: Bearer <NOW_POST_TOKEN> が必要
// 本文: { "title": "...", "body": "Markdown", "publishedAt"?: "2026-10-09T12:00:00+09:00" }
export async function POST(request: Request) {
  const prepared = prepareNowWrite(request)
  if ("error" in prepared) return prepared.error

  const parsed = nowPostInputSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ error: "投稿の形式が正しくありません。", issues: parsed.error.issues }, { status: 400 })
  }

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
    console.error("Failed to save now post", error)
    return Response.json({ error: "投稿の保存に失敗しました。" }, { status: 502 })
  }

  return Response.json(post, { status: 201, headers: { Location: "/now" } })
}
