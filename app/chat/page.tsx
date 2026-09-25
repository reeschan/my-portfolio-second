import type { Metadata } from "next"
import { PageTemplate } from "@/components/page-template"
import { ResumeChat } from "@/components/resume-chat"

export const metadata: Metadata = {
  title: "チャット | Ryuki Tobita's Portfolio",
  description: "職務経歴について AI に質問できるチャット",
}

export default function ChatPage() {
  return (
    <PageTemplate title="チャット">
      <ResumeChat />
    </PageTemplate>
  )
}
