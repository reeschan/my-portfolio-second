import { withBearerAuth } from "@/decorator/with-bearer-auth"
import { withErrorHandling } from "@/decorator/with-error-handling"
import { HttpError } from "@/lib/api/errors"
import { nowWriteAuth, nowWriteErrors } from "@/lib/now/auth"
import { translateNowPostNow } from "@/lib/now/english"
import { requireNowStore } from "@/lib/now/store"

// LLM の訳を待つので、関数の上限まで延ばす (訳の打ち切りは lib/now/translate.ts がこれより手前で行う)
export const maxDuration = 300

type Context = { params: Promise<{ id: string }> }

// 記事の英語版を自動訳で作り直す。持ち主の訳があっても置き換える
// 訳し終えるまで待ち、できた記事をそのまま返す (持ち主が結果をその場で確かめられるように)
export const POST = withErrorHandling(
  withBearerAuth(nowWriteAuth, async (_request, ctx: Context) => {
    const store = requireNowStore()
    const { id } = await ctx.params

    const current = await store.get(id)
    if (!current) throw new HttpError(404, "投稿が見つかりません。")

    const result = await translateNowPostNow(store, current)
    if (!result.ok) {
      if (result.reason === "gone") throw new HttpError(404, "投稿が見つかりません。")
      if (result.reason === "changed") throw new HttpError(409, "訳している間に記事が変わりました。もう一度お試しください。")
      if (result.reason === "not-configured") throw new HttpError(503, "自動訳が設定されていません。")
      throw new HttpError(502, "英語版を作れませんでした。", { details: { reason: result.detail } })
    }
    return Response.json(result.post)
  }),
  nowWriteErrors,
)
