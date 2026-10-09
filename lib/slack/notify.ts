import { apiFetch } from "@/lib/api/client"
import { ApiError } from "@/lib/api/errors"

// Slack の特定のチャンネルへ通知を送る (Incoming Webhook)。ADR 0018
// 投稿先のチャンネルは Webhook の URL を作るときに決まる。URL は環境変数 SLACK_WEBHOOK_URL に入れる
// 通知は付け足しの機能なので、失敗しても例外を投げない (API の本来の処理を失敗させない)。ログに残して false を返す

export type SlackMessage = {
  // 通知のプレビューや、blocks を表示できない環境で出る文字列
  text: string
  // Block Kit。省略したら text だけで送る
  blocks?: SlackBlock[]
}

export type SlackBlock = { type: string; [key: string]: unknown }

const service = "Slack"
// 通知を待つ上限。after() の中で送るのでレスポンスは遅れないが、関数の上限を食いつぶさないよう短くする
const timeoutMs = 5_000

// URL はリクエストのたびに読む (デプロイ後に差し替えても効くように)
function webhookUrl(): string | null {
  return process.env.SLACK_WEBHOOK_URL || null
}

export function isSlackNotifyConfigured(): boolean {
  return webhookUrl() !== null
}

// 送れたら true。未設定・失敗なら false (未設定は何もしない)
export async function notifySlack(message: SlackMessage | string): Promise<boolean> {
  const url = webhookUrl()
  if (!url) return false

  const payload: SlackMessage = typeof message === "string" ? { text: message } : message
  try {
    await apiFetch(url, {
      service,
      timeoutMs,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    return true
  } catch (error) {
    // Webhook の URL は秘密なのでログに出さない。ApiError の文言は呼び出し先の名前とステータスだけで、URL を含まない
    if (error instanceof ApiError) console.error(error.message, error.responseBody ?? "")
    else console.error("Slack notification failed")
    return false
  }
}

// 利用者が書いた文字列を Slack の mrkdwn にそのまま埋め込むと、<!channel> などのメンションやリンクとして解釈される。
// Slack の決まりどおり & < > だけを実体参照にして、ただの文字として出す
export function escapeSlackText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

// 長い本文は通知に収まるよう切り詰める (Block Kit の section の text は 3000 字まで)
export function truncateForSlack(text: string, max = 300): string {
  const chars = Array.from(text)
  return chars.length > max ? `${chars.slice(0, max).join("")}…` : text
}
