import { after } from "next/server"
import { isSlackNotifyConfigured, notifySlack, type SlackMessage } from "@/lib/slack/notify"

type RouteHandler<C> = (request: Request, context: C) => Response | Promise<Response>

export type SlackNotifyInput<C> = {
  // 包んだ処理に渡す前に複製したリクエスト。本文を読んでもよい (包んだ処理が読む本文とは別)
  request: Request
  // 包んだ処理が返したレスポンス。本文を読むときは clone() してから読む (そのまま利用者に返すため)
  response: Response
  context: C
}

// 通知の中身を組み立てる。null を返したら通知しない
export type SlackNotifyBuilder<C> = (input: SlackNotifyInput<C>) => SlackMessage | string | null | Promise<SlackMessage | string | null>

// Route Handler を包み、成功 (2xx) したら Slack へ通知するデコレータ (ADR 0018)
// - 送るのはレスポンスを返したあと (after)。通知を待たせず、通知の失敗で API を失敗させない
// - 失敗 (HttpError などを投げた・2xx 以外を返した) なら通知しない
// - SLACK_WEBHOOK_URL が未設定なら、包んだ処理をそのまま呼ぶだけにする (リクエストの複製もしない)
// 認証で弾いたものを通知しないよう withBearerAuth の外側、エラーをレスポンスにする withErrorHandling の内側に付ける
//   export const POST = withErrorHandling(withSlackNotify(build, withBearerAuth(auth, handler)), errors)
export function withSlackNotify<C>(build: SlackNotifyBuilder<C>, handler: RouteHandler<C>): RouteHandler<C> {
  return async (request, context) => {
    if (!isSlackNotifyConfigured()) return handler(request, context)

    // 包んだ処理が本文を読み切るので、先に複製しておく
    const snapshot = request.clone()
    const response = await handler(request, context)
    if (!response.ok) return response

    // 組み立てはレスポンスを返す前に済ませる (返したあとは本文が読まれ、clone() できなくなるため)
    const message = await buildSafely(build, { request: snapshot, response, context })
    if (message) after(() => notifySlack(message).then(() => undefined))
    return response
  }
}

// 通知の組み立てに失敗しても、API の結果は変えない
async function buildSafely<C>(build: SlackNotifyBuilder<C>, input: SlackNotifyInput<C>) {
  try {
    return await build(input)
  } catch (error) {
    console.error(`${input.request.method} ${new URL(input.request.url).pathname}: failed to build Slack notification`, error)
    return null
  }
}
