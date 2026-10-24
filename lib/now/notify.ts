import type { SlackNotifyBuilder } from "@/decorator/with-slack-notify"
import { escapeSlackText, truncateForSlack, type SlackMessage } from "@/lib/slack/notify"
import { nowPostSchema, type NowPost } from "./schema"

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

// 自動訳に失敗したことを知らせる (docs/specs/now-post-english.md)。どの記事かを題名で、何が起きたかを理由で伝える
// 訳し直しの API は結果を応答で返すので、この通知は使わない
export function nowTranslationFailedMessage(post: NowPost, detail: string): SlackMessage {
  const heading = ":warning: /now の記事の英語版を作れませんでした"
  const reason = escapeSlackText(truncateForSlack(detail))
  return {
    text: `${heading}: ${escapeSlackText(post.title)} (${reason})`,
    blocks: [
      { type: "section", text: { type: "mrkdwn", text: `*${heading}*\n${escapeSlackText(post.title)}` } },
      { type: "section", text: { type: "mrkdwn", text: reason } },
    ],
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
