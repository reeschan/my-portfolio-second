import type { Metadata } from "next"
import { PageTemplate } from "@/components/layout/page-template"
import { WorkGallery } from "@/components/features/works/work-gallery"
import { getMessages } from "@/lib/i18n/server"
import { pageMetadata, pageTitle } from "@/lib/metadata"

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages()
  return pageMetadata({ title: pageTitle(messages.nav.works), description: messages.works.description, path: "/works" })
}

export default async function WorksPage() {
  const messages = await getMessages()

  return (
    <PageTemplate title={messages.nav.works}>
      <WorkGallery />
    </PageTemplate>
  )
}
