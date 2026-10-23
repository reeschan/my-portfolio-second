import type React from "react"
import { SiteFrame } from "@/components/layout/site-frame"

// タブ付きのページの共通のレイアウト。ルートグループなので URL は変わらない (ADR 0035)。
// タブバーをここに置くことで、サイト内を移ってもタブバーを描き直さない
export default function TabsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <SiteFrame>{children}</SiteFrame>
}
