"use client"

import { lazy, Suspense, type ComponentType } from "react"
import { Canvas } from "@react-three/fiber"
import { Preload } from "@react-three/drei"
import type { BackgroundThemeId } from "@/lib/background-theme"

// テーマごとにファイルを分け、選ばれたものだけを読み込む (使わないシェーダーをダウンロードさせない)
const themeScenes: Record<BackgroundThemeId, ComponentType> = {
  grid: lazy(() => import("./themes/grid").then((m) => ({ default: m.GridTheme }))),
  aurora: lazy(() => import("./themes/aurora").then((m) => ({ default: m.AuroraTheme }))),
  "moonlit-sea": lazy(() => import("./themes/moonlit-sea").then((m) => ({ default: m.MoonlitSeaTheme }))),
  "firefly-forest": lazy(() => import("./themes/firefly-forest").then((m) => ({ default: m.FireflyForestTheme }))),
  "lunar-surface": lazy(() => import("./themes/lunar-surface").then((m) => ({ default: m.LunarSurfaceTheme }))),
  eclipse: lazy(() => import("./themes/eclipse").then((m) => ({ default: m.EclipseTheme }))),
}

export function Scene({ themeId }: { themeId: BackgroundThemeId }) {
  const ThemeScene = themeScenes[themeId]

  return (
    // テーマを替えたら Canvas ごと作り直し、前のテーマのカメラ・霧・GPU 資源を残さない
    <Canvas
      key={themeId}
      camera={{ position: [0, 0, 5], fov: 75 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <Suspense fallback={null}>
        <ThemeScene />
        <Preload all />
      </Suspense>
    </Canvas>
  )
}
