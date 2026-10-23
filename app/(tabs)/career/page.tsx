import type { Metadata } from "next"
import { cacheLife } from "next/cache"
import { PageTemplate } from "@/components/layout/page-template"
import { CareerTimeline } from "@/components/features/career/career-timeline"
import { careerByLocale } from "@/data/localized"
import { messagesOf } from "@/data/messages"
import type { Locale } from "@/lib/i18n/config"
import { getLocale } from "@/lib/i18n/server"
import { pageMetadata, pageTitle } from "@/lib/metadata"

export async function generateMetadata(): Promise<Metadata> {
  return careerMetadata(await getLocale())
}

// 言語ごとに作り置きする。中身は data/ の固定の値なので max で足りる (stale が 5 分で App Shell に入る。ADR 0035)
// eslint-disable-next-line @typescript-eslint/require-await
async function careerMetadata(locale: Locale): Promise<Metadata> {
  "use cache"
  cacheLife("max")
  const messages = messagesOf(locale)
  return pageMetadata({ title: pageTitle(messages.nav.career), description: messages.career.description, path: "/career" })
}

export default async function CareerPage() {
  return <CareerContent locale={await getLocale()} />
}

// Cookie は "use cache" の外で読んで引数で渡す (cookies() はキャッシュの中で読めない。next-request-in-use-cache)
// eslint-disable-next-line @typescript-eslint/require-await
async function CareerContent({ locale }: { locale: Locale }) {
  "use cache"
  cacheLife("max")
  const messages = messagesOf(locale)
  return (
    <PageTemplate title={messages.nav.career}>
      <CareerTimeline entries={careerByLocale[locale]} messages={messages.career} />
    </PageTemplate>
  )
}
