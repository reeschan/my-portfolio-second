import type { Metadata } from "next"
import { cacheLife } from "next/cache"
import { TabPageTemplate } from "@/components/layout/tab-page-template"
import { SkillsVisualization } from "@/components/features/skills/skills-visualization"
import { messagesOf } from "@/data/messages"
import type { Locale } from "@/lib/i18n/config"
import { getLocale } from "@/lib/i18n/server"
import { pageMetadata, pageTitle } from "@/lib/metadata"

export async function generateMetadata(): Promise<Metadata> {
  return skillsMetadata(await getLocale())
}

// 言語ごとに作り置きする。中身は data/ の固定の値なので max で足りる (stale が 5 分で App Shell に入る。ADR 0035)
// eslint-disable-next-line @typescript-eslint/require-await
async function skillsMetadata(locale: Locale): Promise<Metadata> {
  "use cache"
  cacheLife("max")
  const messages = messagesOf(locale)
  return pageMetadata({ title: pageTitle(messages.nav.skills), description: messages.skills.description, path: "/skills" })
}

// 見出しとパネルは殻に置く (ADR 0036)。グラフと表はクライアントの部品が言語を読んで描くので、本文も Cookie を読まずに殻に入る
export default function SkillsPage() {
  return (
    <TabPageTemplate id="skills">
      <SkillsVisualization />
    </TabPageTemplate>
  )
}
