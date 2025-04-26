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
              このポートフォリオサイトは「vibecoding」の手法をベースに構築していますが、
              開発の迅速さだけでなく、コードの保守性と設計品質を重視しています。
              高速な開発と優れた保守性を両立させることは、プロフェッショナルな開発者として
              最も大切な価値観の一つです。そのため、十分な検証期間を設けながら
              計画的にリリースを進めていきます。
            </p>
          </div>
        </section>
      </div>
    </PageTemplate>
  )
}

