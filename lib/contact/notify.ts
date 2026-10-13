import { formatJapaneseDateTime } from "@/lib/format"
import { escapeSlackText, type SlackBlock, type SlackMessage } from "@/lib/slack/notify"
import type { ContactInput } from "./schema"

// お問い合わせを Slack に送る中身 (ADR 0028)。持ち主が Slack だけで返信できるよう、本文は切り詰めずに全文を載せる
// 送り主が書いた値はすべて無害化する (<!channel> などのメンションやリンクとして効かせないため)。IP などの入力以外の値は載せない

const heading = ":envelope_with_arrow: お問い合わせがありました"
// Slack の section の text は 3000 字まで。引用の記号 (>) を足す分の余裕を見て、これより短く分ける
const sectionTextMax = 2900

// 無害化した本文を、実体参照 (&amp; など) の途中で切らない単位に分ける
function escapedUnits(message: string): string[] {
  return Array.from(message).map(escapeSlackText)
}

// 1 行ごとに行頭へ > を付けて引用にする (チャットの通知と同じ書き方)
function quote(text: string): string {
  return `>${text.replace(/\n/g, "\n>")}`
}

// 無害化で本文は最大 5 倍に増えるため、2000 字の本文でも 1 つの section に収まらないことがある。上限を超えないよう複数に分ける
function splitIntoSections(message: string): string[] {
  const sections: string[] = []
  let current = ""
  // 引用にしたあとの長さ。行頭の > の 1 字から数え、改行のたびに > が 1 字増える
  let quotedLength = 1
  for (const unit of escapedUnits(message)) {
    const cost = unit.length + (unit === "\n" ? 1 : 0)
    if (current && quotedLength + cost > sectionTextMax) {
      sections.push(quote(current))
      current = ""
      quotedLength = 1
    }
    current += unit
    quotedLength += cost
  }
  if (current) sections.push(quote(current))
  return sections
}

function section(text: string): SlackBlock {
  return { type: "section", text: { type: "mrkdwn", text } }
}

export function buildContactMessage(input: ContactInput, receivedAt: Date): SlackMessage {
  const name = escapeSlackText(input.name)
  const email = escapeSlackText(input.email)
  const fields = [`*名前*: ${name}`, `*メールアドレス*: ${email}`, `*受付日時*: ${formatJapaneseDateTime(receivedAt.toISOString())}`]

  return {
    text: `${heading}: ${name}`,
    blocks: [section(`*${heading}*`), section(fields.join("\n")), ...splitIntoSections(input.message).map(section)],
  }
}
