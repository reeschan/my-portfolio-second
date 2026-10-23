import { PanelFrameFallback } from "@/components/layout/panel-frame-fallback"

// 先読みが済んでいないページに移ったとき、本文のパネルの位置にすぐ出す (ADR 0035)
export default function Loading() {
  return <PanelFrameFallback />
}
