import type { Metadata } from "next"
import { PageTemplate } from "@/components/layout/page-template"
import { CareerTimeline } from "@/components/features/career/career-timeline"
import { careerByLocale } from "@/data/localized"
import { messagesOf } from "@/data/messages"
import { getLocale, getMessages } from "@/lib/i18n/server"
import { pageMetadata, pageTitle } from "@/lib/metadata"

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages()
  return pageMetadata({ title: pageTitle(messages.nav.career), description: messages.career.description, path: "/career" })
}

export default async function CareerPage() {
  const locale = await getLocale()
  const messages = messagesOf(locale)

  return (
    <PageTemplate title={messages.nav.career}>
      <CareerTimeline entries={careerByLocale[locale]} messages={messages.career} />
    </PageTemplate>
  )
}
