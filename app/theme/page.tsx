import type { Metadata } from "next"
import { Section } from "@/components/common"
import { PageTemplate } from "@/components/layout/page-template"
import { ThemePicker } from "@/components/features/theme/theme-picker"
import { getMessages } from "@/lib/i18n/server"
import { pageMetadata, pageTitle } from "@/lib/metadata"
import { isUtilityPage } from "@/lib/navigation"

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages()
  return {
    ...pageMetadata({ title: pageTitle(messages.nav.theme), description: messages.theme.description, path: "/theme" }),
    // 道具のページは検索に載せない (docs/specs/seo-stage2.md)。索引の可否はタブの並びの定義の印から決め、
    // このページに条件を直書きしない
    ...(isUtilityPage("/theme") ? { robots: { index: false, follow: true } } : {}),
  }
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
