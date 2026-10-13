import { PageTemplate } from "@/components/layout/page-template"
import { SkillsVisualization } from "@/components/features/skills/skills-visualization"
import { getMessages } from "@/lib/i18n/server"

export default async function SkillsPage() {
  const messages = await getMessages()

  return (
    <PageTemplate title={messages.nav.skills}>
      <SkillsVisualization />
    </PageTemplate>
  )
}
