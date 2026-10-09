import { prepareNowWrite } from "@/lib/now/respond"

export const runtime = "nodejs"

// /now の記事を 1 件消す。投稿と同じトークンが必要
export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const prepared = prepareNowWrite(request)
  if ("error" in prepared) return prepared.error

  const { id } = await ctx.params
  let removed: boolean
  try {
    removed = await prepared.store.remove(id)
  } catch (error) {
    console.error("Failed to delete now post", error)
    return Response.json({ error: "投稿の削除に失敗しました。" }, { status: 502 })
  }
  if (!removed) return Response.json({ error: "投稿が見つかりません。" }, { status: 404 })

  return new Response(null, { status: 204 })
}
