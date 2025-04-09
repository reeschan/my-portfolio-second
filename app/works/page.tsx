"use client"

import { PageTemplate } from "@/components/page-template"
import Image from "next/image"
import { useState } from "react"
import { PortfolioDialog } from "@/components/portfolio-dialog"

export default function WorksPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  
  return (
    <PageTemplate title="ワーク">
      <div className="grid gap-6 md:grid-cols-2">
        <div 
          className="overflow-hidden rounded-lg border border-border/50 bg-background/50 transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer"
          onClick={() => setDialogOpen(true)}
        >
          <div className="relative h-48 w-full">
            <Image src="/placeholder.svg?height=400&width=600" alt="ポートフォリオサイト" fill className="object-cover transition-transform hover:scale-105" />
          </div>
          <div className="p-4">
            <h3 className="text-lg font-medium">ポートフォリオサイト</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Next.jsとReactを使用して構築された個人ポートフォリオサイト。
              スキルをレーダーチャートで表示、経歴をタイムラインで表示など、
              データ駆動の視覚化を重視したデザイン。
            </p>
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
      
      {/* ポートフォリオの詳細ダイアログ */}
      <PortfolioDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
      />
    </PageTemplate>
  )
}

