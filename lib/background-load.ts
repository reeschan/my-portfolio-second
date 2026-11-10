// 3D 背景の読み込みの時刻を、全ページで共有する小さなストア。
// 読み込みをブラウザの手が空いてから始めて、ボタンの反応を遅らせないようにする。

// 手が空かない端末でも、この時間を過ぎたら読み込みを始める
export const BACKGROUND_LOAD_IDLE_TIMEOUT_MS = 2000

// ---- 読み込みを始めてよいか (ブラウザの手が空いたか) ----

const loadStartListeners = new Set<() => void>()
// 一度 true になったら戻らない
let loadStarted = false
// 予約は 1 回だけにする。2 人目が購読しても requestIdleCallback を増やさない
let loadScheduled = false

export function subscribeBackgroundLoadStart(listener: () => void): () => void {
  loadStartListeners.add(listener)
  scheduleLoadStart()
  return () => {
    loadStartListeners.delete(listener)
  }
}

function scheduleLoadStart(): void {
  if (loadStarted || loadScheduled) return
  loadScheduled = true

  const onIdle = () => {
    if (loadStarted) return
    loadStarted = true
    for (const listener of loadStartListeners) listener()
  }

  if (typeof globalThis.requestIdleCallback === "function") {
    globalThis.requestIdleCallback(onIdle, { timeout: BACKGROUND_LOAD_IDLE_TIMEOUT_MS })
  } else {
    // Safari には requestIdleCallback が無いので、次のタスクで始める
    setTimeout(onIdle, 0)
  }
}

export function getBackgroundLoadStart(): boolean {
  return loadStarted
}

// サーバー描画とハイドレーション中は、まだ読み込みを始めていないものとして扱う
export function getServerBackgroundLoadStart(): boolean {
  return false
}
