import { PageTemplate } from "@/components/layout/page-template"
import { CareerTimeline } from "@/components/features/career/career-timeline"
import { careerByLocale } from "@/data/localized"
import { messagesOf } from "@/data/messages"
import { getLocale } from "@/lib/i18n/server"

export default async function CareerPage() {
  const locale = await getLocale()
  const messages = messagesOf(locale)

  return (
    <PageTemplate title={messages.nav.career}>
      <CareerTimeline entries={careerByLocale[locale]} messages={messages.career} />
    </PageTemplate>
  )
}
