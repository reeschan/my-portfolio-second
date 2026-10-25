"use client"

import type React from "react"
import { GlassPanel } from "@/components/common"
import { useMessages } from "@/lib/i18n/locale-context"
import type { NavId } from "@/lib/navigation"

interface TabPageTemplateProps {
  // どのタブのページか。h1 はタブの表示名と揃える (E2E が見出しでページを判定している)
  id: NavId
  children: React.ReactNode
}

// タブ付きのページの中身: 見出し + ガラス調の本文パネル (ADR 0036)。
// 本文はもう一段の <Suspense> で待たない。待つと、殻に置く既定言語の本文まで後から差し込む穴になり、
// JS を動かさないクローラーが読めなくなる (ADR 0038)。言語はページの Localized が配る
export function TabPageTemplate({ id, children }: TabPageTemplateProps) {
  const messages = useMessages()

  return (
    <>
      <h1 className="mb-6 text-4xl font-bold tracking-tight">{messages.nav[id]}</h1>
      <GlassPanel>{children}</GlassPanel>
    </>
  )
}
