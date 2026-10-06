import type React from "react"
import { GlassPanel } from "@/components/common"
import { BrowserTabs } from "@/components/layout/browser-tabs"

interface PageTemplateProps {
  // ページの h1。タブの表示名と揃える (E2E が見出しでページを判定している)
  title: string
  children: React.ReactNode
}

// 全ページ共通の枠: ブラウザ風タブ + 見出し + ガラス調の本文パネル
export function PageTemplate({ title, children }: PageTemplateProps) {
  return (
    <main className="flex min-h-screen flex-col">
      <BrowserTabs />

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-6 text-4xl font-bold tracking-tight">{title}</h1>
          <GlassPanel>{children}</GlassPanel>
        </div>
      </div>
    </main>
  )
}
