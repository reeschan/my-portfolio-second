"use client"

import { PageTemplate } from "@/components/page-template"
import Image from "next/image"
import { useState } from "react"
import { TechnologyStack } from "@/components/technology-stack"
import { ArchitectureDiagram } from "@/components/architecture-diagram"

export default function WorksPage() {
  const [showDetails, setShowDetails] = useState(false)
  
  return (
    <PageTemplate title="ワーク">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-border/50 bg-background/50 transition-all hover:shadow-md">
          <div className="relative h-48 w-full">
            <Image src="/placeholder.svg?height=400&width=600" alt="ポートフォリオサイト" fill className="object-cover" />
          </div>
          <div className="p-4">
            <h3 className="text-lg font-medium">ポートフォリオサイト</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Next.jsとReactを使用して構築された個人ポートフォリオサイト。
              スキルをレーダーチャートで表示、経歴をタイムラインで表示など、
              データ駆動の視覚化を重視したデザイン。
            </p>
            <button 
              onClick={() => setShowDetails(!showDetails)}
              className="mt-3 px-3 py-1 text-xs rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              {showDetails ? "詳細を隠す" : "詳細を表示"}
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-border/50 bg-background/50 transition-all hover:shadow-md">
          <div className="relative h-48 w-full">
            <Image src="/placeholder.svg?height=400&width=600" alt="プロジェクト2" fill className="object-cover" />
          </div>
          <div className="p-4">
            <h3 className="text-lg font-medium">プロジェクト2</h3>
            <p className="mt-2 text-sm text-muted-foreground">プロジェクト2の説明文をここに記載します。</p>
          </div>
        </div>
      </div>
      
      {/* ポートフォリオの詳細情報 */}
      {showDetails && (
        <div className="mt-8 space-y-8">
          <TechnologyStack />
          <ArchitectureDiagram />
        </div>
      )}
    </PageTemplate>
  )
}

