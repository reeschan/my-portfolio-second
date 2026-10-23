// @coverage-map ignore 全ページの 3D 背景の読み込みで使うストアで、特定のルートに紐づかない
import { afterEach, describe, expect, it, vi } from "vitest"

type BackgroundLoad = typeof import("@/lib/background-load")

type ScheduledIdle = { callback: () => void; options?: IdleRequestOptions }

// ストアはモジュールの中に状態 (始めてよいか・準備完了か・購読者) を持つので、
// テストごとに読み直して初期状態から始める
async function loadStore(): Promise<BackgroundLoad> {
  vi.resetModules()
  return import("@/lib/background-load")
}

// requestIdleCallback に渡された cb を、あとから手で呼べるように控える
function stubIdleCallback(): ScheduledIdle[] {
  const scheduled: ScheduledIdle[] = []
  vi.stubGlobal("requestIdleCallback", (callback: () => void, options?: IdleRequestOptions) => {
    scheduled.push({ callback, options })
    return scheduled.length
  })
  return scheduled
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("背景の読み込みを始めてよいか", () => {
  it("購読するまでは false", async () => {
    stubIdleCallback()
    const { getBackgroundLoadStart } = await loadStore()
    expect(getBackgroundLoadStart()).toBe(false)
  })

  it("購読すると timeout 付きで 1 回だけ予約し、cb のあとで true になって購読者に知らせる", async () => {
    const scheduled = stubIdleCallback()
    const { BACKGROUND_LOAD_IDLE_TIMEOUT_MS, getBackgroundLoadStart, subscribeBackgroundLoadStart } = await loadStore()
    const listener = vi.fn()

    subscribeBackgroundLoadStart(listener)
    expect(scheduled).toHaveLength(1)
    // 手が空かない端末でも、この時間を過ぎたら読み込みを始める
    expect(scheduled[0]!.options).toEqual({ timeout: BACKGROUND_LOAD_IDLE_TIMEOUT_MS })
    expect(getBackgroundLoadStart()).toBe(false)
    expect(listener).not.toHaveBeenCalled()

    scheduled[0]!.callback()
    expect(getBackgroundLoadStart()).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("2 人目が購読しても予約は増えない", async () => {
    const scheduled = stubIdleCallback()
    const { subscribeBackgroundLoadStart } = await loadStore()
    subscribeBackgroundLoadStart(vi.fn())
    subscribeBackgroundLoadStart(vi.fn())

    expect(scheduled).toHaveLength(1)
    scheduled[0]!.callback()
    expect(scheduled).toHaveLength(1)
  })

  it("requestIdleCallback が無いときは setTimeout で代える", async () => {
    vi.useFakeTimers()
    vi.stubGlobal("requestIdleCallback", undefined)
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout")
    const { getBackgroundLoadStart, subscribeBackgroundLoadStart } = await loadStore()
    const listener = vi.fn()

    subscribeBackgroundLoadStart(listener)
    expect(getBackgroundLoadStart()).toBe(false)
    expect(setTimeoutSpy).toHaveBeenCalledTimes(1)
    expect(setTimeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), 0)

    vi.advanceTimersByTime(0)
    expect(getBackgroundLoadStart()).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("購読を解除した購読者には知らせない", async () => {
    const scheduled = stubIdleCallback()
    const { subscribeBackgroundLoadStart } = await loadStore()
    const kept = vi.fn()
    const removed = vi.fn()
    subscribeBackgroundLoadStart(kept)
    const unsubscribe = subscribeBackgroundLoadStart(removed)

    unsubscribe()
    scheduled[0]!.callback()
    expect(kept).toHaveBeenCalledTimes(1)
    expect(removed).not.toHaveBeenCalled()
  })

  it("サーバーでは常に false", async () => {
    const { getServerBackgroundLoadStart } = await loadStore()
    expect(getServerBackgroundLoadStart()).toBe(false)
  })
})

describe("背景の準備完了", () => {
  it("markBackgroundReady で true になり、購読者は 1 回だけ呼ばれる", async () => {
    const { getBackgroundReady, markBackgroundReady, subscribeBackgroundReady } = await loadStore()
    const listener = vi.fn()
    subscribeBackgroundReady(listener)
    expect(getBackgroundReady()).toBe(false)

    markBackgroundReady()
    expect(getBackgroundReady()).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)

    // テーマを替えて Canvas を作り直しても、準備完了は戻さない
    markBackgroundReady()
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("購読を解除した購読者には知らせない", async () => {
    const { markBackgroundReady, subscribeBackgroundReady } = await loadStore()
    const removed = vi.fn()
    const unsubscribe = subscribeBackgroundReady(removed)

    unsubscribe()
    markBackgroundReady()
    expect(removed).not.toHaveBeenCalled()
  })

  it("サーバーでは常に false", async () => {
    const { getServerBackgroundReady } = await loadStore()
    expect(getServerBackgroundReady()).toBe(false)
  })
})
