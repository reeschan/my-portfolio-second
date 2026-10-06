"use client"

import { useCallback, useSyncExternalStore } from "react"

// メディアクエリに合っているかを返す。サーバー描画時は false (スマホ幅向けの出し分けはハイドレーション後に効く)
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query)
      media.addEventListener("change", onChange)
      return () => media.removeEventListener("change", onChange)
    },
    [query],
  )

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}
