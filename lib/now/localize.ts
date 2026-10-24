import type { Locale } from "@/lib/i18n/config"
import type { NowPost } from "@/lib/now/schema"

// 記事を表示言語に合わせて出すための、純粋な関数 (docs/specs/now-post-english.md の「表示」)。
// カード・記事のページ・metadata・JSON-LD がすべてここを通し、出す内容と断り書きの食い違いを防ぐ

// 断り書きの種類。画面の文言は data/messages に置き、ここでは種類だけを返す
export const NowPostNotice = {
  machineTranslated: "machine-translated",
  japaneseOnly: "japanese-only",
} as const
export type NowPostNotice = (typeof NowPostNotice)[keyof typeof NowPostNotice]

export type LocalizedNowPost = {
  title: string
  body: string
  // 出した題名と本文の言語。日本語のまま出す記事を lang="ja" で包むために使う
  lang: Locale
  // 断り書きの種類。要らなければ null
  notice: NowPostNotice | null
}

export function localizeNowPost(post: Pick<NowPost, "title" | "body" | "en">, locale: Locale): LocalizedNowPost {
  // 日本語のときは、英語版があっても今までどおり日本語を出す
  if (locale === "ja") return { title: post.title, body: post.body, lang: "ja", notice: null }

  const en = post.en
  // 英語版が無い記事は日本語のまま出し、表示の不具合と取り違えないよう断る
  if (!en) return { title: post.title, body: post.body, lang: "ja", notice: NowPostNotice.japaneseOnly }

  return {
    title: en.title,
    body: en.body,
    lang: "en",
    // 自動訳は持ち主の英語力と取り違えないよう、機械の訳であることを断る。持ち主の訳は断らない
    notice: en.source === "auto" ? NowPostNotice.machineTranslated : null,
  }
}
