"use client"

import { useSyncExternalStore } from "react"

const subscribe = () => () => {}

// ブラウザで描画しているときだけ true。サーバー描画とハイドレーション中は false。
// three.js や recharts のように、ブラウザでしか描けないものの出し分けに使う
// (useEffect で setState するとレンダーが 1 回余計に走るため useSyncExternalStore を使う)
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}
