"use client"

import dynamic from "next/dynamic"
import { useIsClient } from "@/hooks/use-is-client"

// three.js はブラウザでしか動かないため、クライアントでだけ読み込む
const Scene = dynamic(() => import("./scene").then((mod) => mod.Scene), {
  ssr: false,
  loading: () => <div className="fixed inset-0 -z-10 bg-background/50" />,
})

// 全ページの背後に置く 3D 背景 (装飾なので a11y 検査の対象外にしている)
export function BackgroundScene() {
  const isClient = useIsClient()

  if (!isClient) {
    return <div className="fixed inset-0 -z-10 bg-background/50" />
  }

  return (
    <div className="fixed inset-0 -z-10">
      <Scene />
    </div>
  )
}
