import { PageTemplate } from "@/components/page-template"

export default function OverviewPage() {
  return (
    <PageTemplate title="概要">
      <h2 className="mb-4 text-2xl font-semibold">プロフィール</h2>
      <p className="text-muted-foreground">ここにポートフォリオの概要を記載します。</p>
    </PageTemplate>
  )
}

