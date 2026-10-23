"use client"

import type React from "react"
import { Suspense } from "react"
import { GlassPanel } from "@/components/common"
import { PanelBodyFallback } from "@/components/layout/panel-frame-fallback"
import { useMessages } from "@/lib/i18n/locale-context"
import type { NavId } from "@/lib/navigation"

interface TabPageTemplateProps {
  // どのタブのページか。h1 はタブの表示名と揃える (E2E が見出しでページを判定している)
  id: NavId
  // Cookie に依る本文。言語を読む async の部品を渡す
  children: React.ReactNode
}

// タブ付きのページの中身: 見出し + ガラス調の本文パネル (ADR 0036)。
// 見出しは共通の枠が配る言語で手元で描けるので、パネルの外枠と一緒に殻に置く。
// こうすると、移動先のページで新しく出る <Suspense> はパネルの中のものだけになる。
// 先読みが済む前に押しても見出しは消えず、本文はサーバーの応答を待って一度に替わる
export function TabPageTemplate({ id, children }: TabPageTemplateProps) {
  const messages = useMessages()

  return (
    <>
      <h1 className="mb-6 text-4xl font-bold tracking-tight">{messages.nav[id]}</h1>
      <GlassPanel>
        <Suspense fallback={<PanelBodyFallback />}>{children}</Suspense>
      </GlassPanel>
    </>
  )
}
