import type { Metadata } from "next"
import { PageTemplate } from "@/components/layout/page-template"
import { SkillsVisualization } from "@/components/features/skills/skills-visualization"
import { getMessages } from "@/lib/i18n/server"
import { pageMetadata, pageTitle } from "@/lib/metadata"

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages()
  return pageMetadata({ title: pageTitle(messages.nav.skills), description: messages.skills.description, path: "/skills" })
}

export default async function SkillsPage() {
  const messages = await getMessages()

  return (
    <PageTemplate title={messages.nav.skills}>
      <SkillsVisualization />
    </PageTemplate>
  )
}
