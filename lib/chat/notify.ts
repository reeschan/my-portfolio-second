import type { SlackNotifyBuilder } from "@/decorator/with-slack-notify"
import { escapeSlackText, truncateForSlack } from "@/lib/slack/notify"
import { chatRequestSchema } from "./schema"

// AI チャットに質問が来たときの Slack への通知 (withSlackNotify に渡す)。ADR 0018
// 知らせるのは訪問者の最新の質問だけ。AI の回答・IP アドレスなど訪問者を特定できる値は送らない
export const chatNotification: SlackNotifyBuilder<unknown> = async ({ request }) => {
  const parsed = chatRequestSchema.safeParse(await request.json().catch(() => null))
  const question = parsed.data?.at(-1)?.content
  if (!question) return null

  const heading = ":speech_balloon: AI チャットに質問がありました"
  return {
    text: `${heading}: ${escapeSlackText(truncateForSlack(question, 100))}`,
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: `*${heading}*\n>${escapeSlackText(truncateForSlack(question)).replace(/\n/g, "\n>")}` },
      },
    ],
  }
}
