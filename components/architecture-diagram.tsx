"use client"

import { Card, CardContent } from "@/components/ui/card"
import { useMediaQuery } from "@/hooks/use-media-query"

export function ArchitectureDiagram() {
  const isMobile = useMediaQuery("(max-width: 640px)")

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">アーキテクチャ</h2>
      <Card className="overflow-hidden">
        <CardContent className="pt-6">
          <div className="relative" style={{ height: isMobile ? "300px" : "400px" }}>
            {/* アーキテクチャ図 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
              <h3 className="text-xl font-medium mb-4">アーキテクチャ構成</h3>
              
              <div className="w-full max-w-2xl mx-auto grid grid-cols-3 gap-4 text-sm">
                {/* 1行目: ユーザーインターフェース */}
                <div className="col-span-3 p-3 bg-primary/10 rounded-md border border-primary/20 transition-all hover:bg-primary/15 hover:shadow-md">
                  <strong>UI レイヤー</strong>
                  <p>コンポーネント (Tailwind, Framer Motion)</p>
                </div>
                
                {/* 2行目: データと状態管理 */}
                <div className="col-span-3 p-3 bg-blue-500/10 rounded-md border border-blue-500/20 transition-all hover:bg-blue-500/15 hover:shadow-md">
                  <strong>データレイヤー</strong>
                  <p>React Hooks, Context API</p>
                </div>
                
                {/* 3行目: 視覚化 */}
                <div className="col-span-3 p-3 bg-green-500/10 rounded-md border border-green-500/20 transition-all hover:bg-green-500/15 hover:shadow-md">
                  <strong>視覚化レイヤー</strong>
                  <p>Recharts, React Vertical Timeline</p>
                </div>
                
                {/* 4行目: インフラ */}
                <div className="col-span-3 p-3 bg-purple-500/10 rounded-md border border-purple-500/20 transition-all hover:bg-purple-500/15 hover:shadow-md">
                  <strong>インフラ</strong>
                  <p>Next.js, Vercel</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
