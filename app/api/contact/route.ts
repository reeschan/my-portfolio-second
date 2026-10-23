import { withErrorHandling } from "@/decorator/with-error-handling"
import { HttpError } from "@/lib/api/errors"
import { readJsonBody } from "@/lib/api/request"
import { buildContactMessage } from "@/lib/contact/notify"
import { type ContactInput, contactSchema } from "@/lib/contact/schema"
import { createRateLimiter } from "@/lib/rate-limit"
import { isSlackNotifyConfigured, notifySlack } from "@/lib/slack/notify"

// お問い合わせを受け取り、持ち主の Slack に届ける (ADR 0028)
// Slack が唯一の届け先なので、応答のあとに失敗を許して送る通知のデコレータ (ADR 0018) は使わない。
// 応答の前に送って結果を待ち、届いたときだけ受け付けたと返す (届かないまま「受け付けました」と見せないため)

const failedMessage = "送信に失敗しました。時間をおいてもう一度お試しください。"

// 連打で Slack が埋もれないよう、お問い合わせは 1 時間 5 回まで。チャットとは別の枠で数える
const isContactRateLimited = createRateLimiter({ windowMs: 60 * 60 * 1000, maxRequests: 5 })

const received = () => Response.json({ received: true }, { status: 200 })

// IP はチャットの route と同じく x-forwarded-for の先頭から取る
function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
}

// ハニーポット (人には見えない入力欄) が埋まっていれば bot とみなす
function isBot(input: ContactInput): boolean {
  return (input.website?.trim() ?? "") !== ""
}

async function handler(request: Request): Promise<Response> {
  // 送ったつもりで誰にも届かない状態を作らないよう、届け先が無ければ最初に断る
  if (!isSlackNotifyConfigured()) throw new HttpError(503, "現在お問い合わせを受け付けられません。")
  if (isContactRateLimited(clientIp(request))) {
    throw new HttpError(429, "送信が多すぎます。しばらく時間をおいてからお試しください。")
  }

  const input = await readJsonBody(request, contactSchema, "入力内容が正しくありません。")
  // bot には成功したと思わせ、手口を変えるきっかけを与えない
  if (isBot(input)) return received()

  const sent = await notifySlack(buildContactMessage(input, new Date()))
  if (!sent) throw new HttpError(502, failedMessage)
  return received()
}

export const POST = withErrorHandling(handler, { upstream: failedMessage })
