import type { Metadata } from "next"
import { PageTemplate } from "@/components/layout/page-template"
import { ContactForm } from "@/components/features/contact/contact-form"
import { getMessages } from "@/lib/i18n/server"
import { pageMetadata, pageTitle } from "@/lib/metadata"

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages()
  return pageMetadata({ title: pageTitle(messages.nav.contact), description: messages.contact.description, path: "/contact" })
}

export default async function ContactPage() {
  const messages = await getMessages()

  return (
    <PageTemplate title={messages.nav.contact}>
      <ContactForm />
    </PageTemplate>
  )
}
