// @perspectives theme interaction
// @routes /theme
import { existsSync } from "node:fs"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// ストアはモジュール内に状態 (購読者・メモリ上の選択) を持つので、テストごとに読み込み直す
async function loadStore() {
  vi.resetModules()
  return import("@/lib/background-theme")
}

function fakeStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, String(v)),
  }
}

describe("backgroundThemes", () => {
  it("id が重複せず、既定のテーマを含む", async () => {
    const { backgroundThemes, defaultBackgroundThemeId } = await loadStore()
    const ids = backgroundThemes.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain(defaultBackgroundThemeId)
  })

  it("どのテーマにも 3D シーンのファイルがある", async () => {
    const { backgroundThemes } = await loadStore()
    for (const t of backgroundThemes) {
      const file = path.resolve(__dirname, "../../components/features/background/themes", `${t.id}.tsx`)
      expect(existsSync(file), file).toBe(true)
    }
  })
})

describe("選択中のテーマのストア", () => {
  beforeEach(() => {
    vi.stubGlobal("window", Object.assign(new EventTarget(), { localStorage: fakeStorage() }))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("何も保存されていなければ既定のテーマ", async () => {
    const { getBackgroundThemeId, defaultBackgroundThemeId } = await loadStore()
    expect(getBackgroundThemeId()).toBe(defaultBackgroundThemeId)
  })

  it("選んだテーマを保存し、購読者に知らせる", async () => {
    const store = await loadStore()
    const listener = vi.fn()
    const unsubscribe = store.subscribeBackgroundTheme(listener)

    store.setBackgroundThemeId("aurora")
    expect(store.getBackgroundThemeId()).toBe("aurora")
    expect(window.localStorage.getItem("background-theme")).toBe("aurora")
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    store.setBackgroundThemeId("eclipse")
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("保存された値が知らない id なら既定に戻す", async () => {
    window.localStorage.setItem("background-theme", "no-such-theme")
    const { getBackgroundThemeId, defaultBackgroundThemeId } = await loadStore()
    expect(getBackgroundThemeId()).toBe(defaultBackgroundThemeId)
  })

  it("localStorage が使えなくても、同じタブの中では切り替えられる", async () => {
    const broken = fakeStorage()
    broken.getItem = () => {
      throw new Error("SecurityError")
    }
    broken.setItem = () => {
      throw new Error("QuotaExceededError")
    }
    vi.stubGlobal("window", Object.assign(new EventTarget(), { localStorage: broken }))
    const store = await loadStore()

    store.setBackgroundThemeId("lunar-surface")
    expect(store.getBackgroundThemeId()).toBe("lunar-surface")
  })

  it("別のタブでの変更 (storage イベント) も購読者に知らせる", async () => {
    const store = await loadStore()
    const listener = vi.fn()
    store.subscribeBackgroundTheme(listener)

    const other = Object.assign(new Event("storage"), { key: "unrelated" })
    window.dispatchEvent(other)
    expect(listener).not.toHaveBeenCalled()

    const ours = Object.assign(new Event("storage"), { key: "background-theme" })
    window.dispatchEvent(ours)
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
