import type { Metadata } from "next"
import { cacheLife } from "next/cache"
import { PageTemplate } from "@/components/layout/page-template"
import { ContactForm } from "@/components/features/contact/contact-form"
import { messagesOf } from "@/data/messages"
import type { Locale } from "@/lib/i18n/config"
import { getLocale } from "@/lib/i18n/server"
import { pageMetadata, pageTitle } from "@/lib/metadata"

export async function generateMetadata(): Promise<Metadata> {
  return contactMetadata(await getLocale())
}

// 言語ごとに作り置きする。中身は data/ の固定の値なので max
// eslint-disable-next-line @typescript-eslint/require-await
async function contactMetadata(locale: Locale): Promise<Metadata> {
  "use cache"
  cacheLife("max")
  const messages = messagesOf(locale)
  return pageMetadata({ title: pageTitle(messages.nav.contact), description: messages.contact.description, path: "/contact" })
}

export default async function ContactPage() {
  // Cookie は "use cache" の中で読めないので、外で読んだ言語を引数にして中身に渡す (ADR 0035)
  return <ContactContent locale={await getLocale()} />
}

// 言語ごとに作り置きし、先読みのページの殻 (App Shell) に入れる。入力中の値はクライアントの部品が持つので、
// キャッシュしてもフォームの動きは変わらない
// eslint-disable-next-line @typescript-eslint/require-await
async function ContactContent({ locale }: { locale: Locale }) {
  "use cache"
  cacheLife("max")
  const messages = messagesOf(locale)

  return (
    <PageTemplate title={messages.nav.contact}>
      <ContactForm />
    </PageTemplate>
  )
}
