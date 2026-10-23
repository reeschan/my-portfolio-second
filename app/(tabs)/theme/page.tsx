import type { Metadata } from "next"
import { cacheLife } from "next/cache"
import { Section } from "@/components/common"
import { PageTemplate } from "@/components/layout/page-template"
import { ThemePicker } from "@/components/features/theme/theme-picker"
import { messagesOf } from "@/data/messages"
import type { Locale } from "@/lib/i18n/config"
import { getLocale } from "@/lib/i18n/server"
import { pageMetadata, pageTitle } from "@/lib/metadata"
import { isUtilityPage } from "@/lib/navigation"

export async function generateMetadata(): Promise<Metadata> {
  return themeMetadata(await getLocale())
}

// 言語ごとに作り置きする。中身は data/ の固定の値なので max
// eslint-disable-next-line @typescript-eslint/require-await
async function themeMetadata(locale: Locale): Promise<Metadata> {
  "use cache"
  cacheLife("max")
  const messages = messagesOf(locale)
  return {
    ...pageMetadata({ title: pageTitle(messages.nav.theme), description: messages.theme.description, path: "/theme" }),
    // 道具のページは検索に載せない (docs/specs/seo-stage2.md)。索引の可否はタブの並びの定義の印から決め、
    // このページに条件を直書きしない
    ...(isUtilityPage("/theme") ? { robots: { index: false, follow: true } } : {}),
  }
}

export default async function ThemePage() {
  // Cookie は "use cache" の中で読めないので、外で読んだ言語を引数にして中身に渡す (ADR 0035)
  return <ThemeContent locale={await getLocale()} />
}

// 言語ごとに作り置きし、先読みのページの殻 (App Shell) に入れる。選んだテーマはクライアントの部品が持つので、
// キャッシュしても切り替えの動きは変わらない
// eslint-disable-next-line @typescript-eslint/require-await
async function ThemeContent({ locale }: { locale: Locale }) {
  "use cache"
  cacheLife("max")
  const messages = messagesOf(locale)

  return (
    <PageTemplate title={messages.nav.theme}>
      <Section title={messages.theme.heading}>
        <p className="mb-6 text-muted-foreground">{messages.theme.intro}</p>
        <ThemePicker />
      </Section>
    </PageTemplate>
  )
}
