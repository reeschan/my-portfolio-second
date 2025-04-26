import { PageTemplate } from "@/components/page-template"

export default function OverviewPage() {
  return (
    <PageTemplate title="概要">
      <div className="space-y-6">
        <section>
          <h2 className="mb-4 text-2xl font-semibold">プロフィール</h2>
          <p className="text-muted-foreground">ここにポートフォリオの概要を記載します。</p>
        </section>
        
        <section>
          <h2 className="mb-4 text-2xl font-semibold">コンセプト</h2>
          <div className="rounded-lg bg-primary/5 p-4 border border-primary/10">
            <p className="text-muted-foreground">
              このportfolioはvibecodingベースで作っていますが、高速で作っても保守性が高くなければ意味がなく、
              ある程度は保守性を保てる良い設計であることというのは仕事をするうえで大事なことなので
              リリースは一定期間を設けてしていくつもりです。
            </p>
          </div>
        </section>
      </div>
    </PageTemplate>
  )
}

