import type { Metadata } from "next"
import { Section } from "@/components/common"
import { PageTemplate } from "@/components/layout/page-template"
import { ThemePicker } from "@/components/features/theme/theme-picker"
import { getMessages } from "@/lib/i18n/server"
import { pageMetadata, pageTitle } from "@/lib/metadata"

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages()
  return pageMetadata({ title: pageTitle(messages.nav.theme), description: messages.theme.description, path: "/theme" })
}

export default async function ThemePage() {
  const messages = await getMessages()

  return (
    <PageTemplate title={messages.nav.theme}>
      <Section title={messages.theme.heading}>
        <p className="mb-6 text-muted-foreground">{messages.theme.intro}</p>
        <ThemePicker />
      </Section>
    </PageTemplate>
  )
}
