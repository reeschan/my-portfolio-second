"use client"

import { lazy, Suspense, useEffect, useState, type ComponentType } from "react"
import { Canvas, useThree } from "@react-three/fiber"
import { PerformanceMonitor, Preload } from "@react-three/drei"
import type { BackgroundThemeId } from "@/lib/background-theme"
import { BACKGROUND_DPR_MAX, BACKGROUND_DPR_MIN, BACKGROUND_FPS, BACKGROUND_MIN_FPS, nextFrameTime } from "@/lib/background-frame"
import { useMediaQuery } from "@/hooks/use-media-query"

// テーマごとにファイルを分け、選ばれたものだけを読み込む (使わないシェーダーをダウンロードさせない)
const themeScenes: Record<BackgroundThemeId, ComponentType> = {
  grid: lazy(() => import("./themes/grid").then((m) => ({ default: m.GridTheme }))),
  aurora: lazy(() => import("./themes/aurora").then((m) => ({ default: m.AuroraTheme }))),
  "moonlit-sea": lazy(() => import("./themes/moonlit-sea").then((m) => ({ default: m.MoonlitSeaTheme }))),
  "firefly-forest": lazy(() => import("./themes/firefly-forest").then((m) => ({ default: m.FireflyForestTheme }))),
  "lunar-surface": lazy(() => import("./themes/lunar-surface").then((m) => ({ default: m.LunarSurfaceTheme }))),
  eclipse: lazy(() => import("./themes/eclipse").then((m) => ({ default: m.EclipseTheme }))),
}

// 毎フレーム全画面を描くと重いので、frameloop="never" にしてここで 30fps に間引いて描かせる
function FrameLimiter() {
  const advance = useThree((s) => s.advance)

  useEffect(() => {
    const interval = 1000 / BACKGROUND_FPS
    let start: number | null = null
    let last: number | null = null
    let id = 0

    const loop = (t: number) => {
      start ??= t
      const next = nextFrameTime(t, last, interval)
      if (next !== null) {
        last = next
        // 引数は秒で、R3F はこれを clock.elapsedTime にそのまま入れる。
        // テーマのシェーダーの uTime がこの値なので、0 付近から始めて浮動小数の精度を保つ
        advance((t - start) / 1000)
      }
      id = requestAnimationFrame(loop)
    }
    id = requestAnimationFrame(loop)

    return () => cancelAnimationFrame(id)
  }, [advance])

  return null
}

export function Scene({ themeId }: { themeId: BackgroundThemeId }) {
  const ThemeScene = themeScenes[themeId]
  // 視差効果を減らす設定では動かさず、止まった 1 枚だけを描く
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)")
  const [dpr, setDpr] = useState(BACKGROUND_DPR_MAX)

  return (
    // テーマを替えたら Canvas ごと作り直し、前のテーマのカメラ・霧・GPU 資源を残さない
    // antialias は切り、GPU の選び方は既定に任せる (ノート PC で外付けの GPU を起こさない)
    <Canvas
      key={themeId}
      camera={{ position: [0, 0, 5], fov: 75 }}
      frameloop={reducedMotion ? "demand" : "never"}
      // 数値を渡すと端末の画素密度に関係なくその倍率で描くので、範囲で渡して端末の値を上限で抑える
      dpr={[BACKGROUND_DPR_MIN, dpr]}
      gl={{ antialias: false, alpha: true }}
    >
      {!reducedMotion && (
        <>
          <FrameLimiter />
          {/* drei の既定の bounds は 40〜60fps で、30fps に間引くと常に重いと判定される。上限を Infinity にして下げる方向だけにする */}
          <PerformanceMonitor bounds={() => [BACKGROUND_MIN_FPS, Infinity]} onDecline={() => setDpr(BACKGROUND_DPR_MIN)} />
        </>
      )}
      <Suspense fallback={null}>
        <ThemeScene />
        <Preload all />
      </Suspense>
    </Canvas>
  )
}
