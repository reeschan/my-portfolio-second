import type React from "react"
import { GlassPanel } from "@/components/common"

interface PageTemplateProps {
  // ページの h1。タブの表示名と揃える (E2E が見出しでページを判定している)
  title: string
  children: React.ReactNode
}

// ページの中身: 見出し + ガラス調の本文パネル。
// タブバーと外枠は共通のレイアウトの SiteFrame が持つ (ADR 0035)
export function PageTemplate({ title, children }: PageTemplateProps) {
  return (
    <>
      <h1 className="mb-6 text-4xl font-bold tracking-tight">{title}</h1>
      <GlassPanel>{children}</GlassPanel>
    </>
  )
}
