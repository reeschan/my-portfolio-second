import { withBearerAuth } from "@/decorator/with-bearer-auth"
import { nowWriteAuth } from "@/lib/now/auth"
import { invalidPostResponse, postNotFoundResponse, requireNowStore, storeFailedResponse } from "@/lib/now/responses"
import { nowPostInputSchema, type NowPost } from "@/lib/now/schema"

export const runtime = "nodejs"

type Context = { params: Promise<{ id: string }> }

// /now の記事を 1 件書き換える。本文は POST と同じ形で、題名と本文はまるごと置き換える
// publishedAt を省略したら元の公開日時のまま (並び順を変えずに誤字を直せるように)
export const PUT = withBearerAuth(nowWriteAuth, async (request, ctx: Context) => {
  const prepared = requireNowStore()
  if ("error" in prepared) return prepared.error

  const parsed = nowPostInputSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return invalidPostResponse(parsed.error.issues)

  const { id } = await ctx.params
  try {
    const current = await prepared.store.get(id)
    if (!current) return postNotFoundResponse()

    const { title, body, publishedAt } = parsed.data
    const post: NowPost = {
      id,
      title,
      body,
      publishedAt: publishedAt ? new Date(publishedAt).toISOString() : current.publishedAt,
      updatedAt: new Date().toISOString(),
    }
    await prepared.store.save(post)
    return Response.json(post)
  } catch (error) {
    return storeFailedResponse("update", error)
  }
})

// /now の記事を 1 件消す
export const DELETE = withBearerAuth(nowWriteAuth, async (_request, ctx: Context) => {
  const prepared = requireNowStore()
  if ("error" in prepared) return prepared.error

  const { id } = await ctx.params
  let removed: boolean
  try {
    removed = await prepared.store.remove(id)
  } catch (error) {
    return storeFailedResponse("delete", error)
  }
  return removed ? new Response(null, { status: 204 }) : postNotFoundResponse()
})
