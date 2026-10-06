import { Section } from "@/components/common"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// 上から順に積み上げるレイヤー。色は chart-1〜4 のトークンを順に使う
const layers = [
  { name: "UI レイヤー", detail: "コンポーネント (Tailwind, Motion)", tone: "border-chart-1/20 bg-chart-1/10 hover:bg-chart-1/15" },
  { name: "データレイヤー", detail: "React Hooks, Context API", tone: "border-chart-2/20 bg-chart-2/10 hover:bg-chart-2/15" },
  { name: "視覚化レイヤー", detail: "Recharts", tone: "border-chart-3/20 bg-chart-3/10 hover:bg-chart-3/15" },
  { name: "インフラ", detail: "Next.js, Vercel", tone: "border-chart-4/20 bg-chart-4/10 hover:bg-chart-4/15" },
] as const

export function ArchitectureDiagram() {
  return (
    <Section title="アーキテクチャ" size="lg">
      <Card className="overflow-hidden">
        <CardContent className="pt-6">
          <h3 className="mb-4 text-center text-xl font-medium">アーキテクチャ構成</h3>
          <ol className="mx-auto grid w-full max-w-2xl gap-4 text-center text-sm">
            {layers.map((layer) => (
              <li key={layer.name} className={cn("rounded-md border p-3 transition-all hover:shadow-md", layer.tone)}>
                <strong>{layer.name}</strong>
                <p>{layer.detail}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </Section>
  )
}
