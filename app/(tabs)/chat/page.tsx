import type { Metadata } from "next"
import { cacheLife } from "next/cache"
import { TabPageTemplate } from "@/components/layout/tab-page-template"
import { ResumeChat } from "@/components/features/chat/resume-chat"
import { messagesOf } from "@/data/messages"
import type { Locale } from "@/lib/i18n/config"
import { getLocale } from "@/lib/i18n/server"
import { pageMetadata, pageTitle } from "@/lib/metadata"

export async function generateMetadata(): Promise<Metadata> {
  return chatMetadata(await getLocale())
}

// 言語ごとに作り置きする。中身は data/ の固定の値なので max
// eslint-disable-next-line @typescript-eslint/require-await
async function chatMetadata(locale: Locale): Promise<Metadata> {
  "use cache"
  cacheLife("max")
  const messages = messagesOf(locale)
  return pageMetadata({ title: pageTitle(messages.nav.chat), description: messages.chat.description, path: "/chat" })
}

// 見出しとパネルは殻に置く (ADR 0036)。会話の状態と文言はクライアントの部品が持つので、本文も Cookie を読まずに殻に入る
export default function ChatPage() {
  return (
    <TabPageTemplate id="chat">
      <ResumeChat />
    </TabPageTemplate>
  )
}
