import { Section } from "@/components/common"
import { PageTemplate } from "@/components/layout/page-template"

export default function OverviewPage() {
  return (
    <PageTemplate title="概要">
      <Section title="プロフィール" size="lg">
        <p className="text-muted-foreground">ここにポートフォリオの概要を記載します。</p>
      </Section>
    </PageTemplate>
  )
}
