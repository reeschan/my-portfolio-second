// 3D 背景の読み込みの時刻と、背景の準備完了を、全ページで共有する小さなストア。
// 読み込みをブラウザの手が空いてから始めて、ボタンの反応を遅らせないようにする。
// トップの導入演出は準備完了を購読して、3D 背景への引き継ぎの時刻を決める (docs/specs/intro-handoff.md)

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

// ---- 背景の準備完了 (最初の 1 枚を描き終えた) ----

const readyListeners = new Set<() => void>()
// 一度 true になったら戻らない。テーマを替えて Canvas を作り直しても戻さない
let ready = false

export function markBackgroundReady(): void {
  if (ready) return
  ready = true
  // 1 回目だけ知らせる。2 回目以降は何もしない
  for (const listener of readyListeners) listener()
}

export function subscribeBackgroundReady(listener: () => void): () => void {
  readyListeners.add(listener)
  return () => {
    readyListeners.delete(listener)
  }
}

export function getBackgroundReady(): boolean {
  return ready
}

// サーバー描画とハイドレーション中は、まだ準備完了ではないものとして扱う
export function getServerBackgroundReady(): boolean {
  return false
}
