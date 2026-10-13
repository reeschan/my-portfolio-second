import type { Metadata } from "next"
import { PageTemplate } from "@/components/layout/page-template"
import { ResumeChat } from "@/components/features/chat/resume-chat"
import { getMessages } from "@/lib/i18n/server"
import { pageTitle } from "@/lib/metadata"

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages()
  return { title: pageTitle(messages.nav.chat), description: messages.chat.description }
}

export default async function ChatPage() {
  const messages = await getMessages()

  return (
    <PageTemplate title={messages.nav.chat}>
      <ResumeChat />
    </PageTemplate>
  )
}
