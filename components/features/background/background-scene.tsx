"use client"

import { useSyncExternalStore } from "react"
import dynamic from "next/dynamic"
import { useIsClient } from "@/hooks/use-is-client"
import { getBackgroundThemeId, getServerBackgroundThemeId, subscribeBackgroundTheme } from "@/lib/background-theme"

// three.js はブラウザでしか動かないため、クライアントでだけ読み込む
const Scene = dynamic(() => import("./scene").then((mod) => mod.Scene), {
  ssr: false,
  loading: () => <div className="fixed inset-0 -z-10 bg-background/50" />,
})

// 全ページの背後に置く 3D 背景 (装飾なので a11y 検査の対象外にしている)
export function BackgroundScene() {
  const isClient = useIsClient()
  // 選択中のテーマ (/theme で選ぶ)。シーンの読み込みを待たずに枠へ印を付け、E2E がどのテーマかを確かめられるようにする
  const themeId = useSyncExternalStore(subscribeBackgroundTheme, getBackgroundThemeId, getServerBackgroundThemeId)

  if (!isClient) {
    return <div className="fixed inset-0 -z-10 bg-background/50" />
  }

  return (
    <div className="fixed inset-0 -z-10" data-background-theme={themeId}>
      <Scene themeId={themeId} />
    </div>
  )
}
