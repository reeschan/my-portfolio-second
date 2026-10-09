import type { SlackNotifyBuilder } from "@/decorator/with-slack-notify"
import { escapeSlackText, truncateForSlack, type SlackMessage } from "@/lib/slack/notify"
import { nowPostSchema } from "./schema"

// /now の記事を書き換えたときの Slack への通知 (withSlackNotify に渡す)。ADR 0018
// 中身は API が返した記事 (保存したもの) から作る。リクエストの本文ではなく、実際に保存された値を知らせるため

export type NowPostAction = "created" | "updated"

const headings: Record<NowPostAction, string> = {
  created: ":memo: /now に記事を投稿しました",
  updated: ":pencil2: /now の記事を更新しました",
}

export function nowPostNotification(action: NowPostAction): SlackNotifyBuilder<unknown> {
  return async ({ request, response }) => {
    const post = nowPostSchema.parse(await response.clone().json())
    const pageUrl = `${new URL(request.url).origin}/now`
    return buildMessage(headings[action], post.title, post.body, pageUrl)
  }
}

function buildMessage(heading: string, title: string, body: string, pageUrl: string): SlackMessage {
  return {
    text: `${heading}: ${escapeSlackText(title)}`,
    blocks: [
      { type: "section", text: { type: "mrkdwn", text: `*${heading}*\n<${pageUrl}|${escapeSlackText(title)}>` } },
      { type: "section", text: { type: "mrkdwn", text: escapeSlackText(truncateForSlack(body)) } },
    ],
  }
}
