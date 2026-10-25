import type { Metadata } from "next"
import { cacheLife } from "next/cache"
import { Localized } from "@/components/layout/localized"
import { TabPageTemplate } from "@/components/layout/tab-page-template"
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

// 見出しとフォームは既定の言語で殻に置く。文言はクライアントの部品が言語を読む (ADR 0038)
export default function ContactPage() {
  return (
    <Localized>
      {() => (
        <TabPageTemplate id="contact">
          <ContactForm />
        </TabPageTemplate>
      )}
    </Localized>
  )
}
