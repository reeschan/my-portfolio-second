// 3D 背景のテーマ。/theme ページで選び、全ページの背景 (components/features/background) に反映する。
// 選んだテーマは localStorage に残し、次に開いたときも同じ背景にする (docs/adr/0012-background-themes.md)

export type BackgroundThemeId = "grid" | "aurora" | "moonlit-sea" | "firefly-forest" | "lunar-surface" | "eclipse"

export type BackgroundTheme = {
  id: BackgroundThemeId
  // カードの見本に塗るグラデーション。three.js の描画を待たずに雰囲気が分かるようにする
  swatch: readonly [string, string, string]
}

// 並び順がそのまま /theme の一覧の順になる。表示名と説明は言語ごとに data/messages/ に持つ
export const backgroundThemes: readonly BackgroundTheme[] = [
  {
    id: "grid",
    swatch: ["#0b1020", "#13203a", "#3399ff"],
  },
  {
    id: "aurora",
    swatch: ["#020611", "#0b3b3a", "#4dffb0"],
  },
  {
    id: "moonlit-sea",
    swatch: ["#03060f", "#16264a", "#e8e4d0"],
  },
  {
    id: "firefly-forest",
    swatch: ["#020805", "#0d2318", "#d8ff6a"],
  },
  {
    id: "lunar-surface",
    swatch: ["#000000", "#2b2b2e", "#4f8fd6"],
  },
  {
    id: "eclipse",
    swatch: ["#000000", "#1a0f26", "#ffd9a0"],
  },
]

export const defaultBackgroundThemeId: BackgroundThemeId = "grid"

const storageKey = "background-theme"

export function isBackgroundThemeId(value: unknown): value is BackgroundThemeId {
  return typeof value === "string" && backgroundThemes.some((t) => t.id === value)
}

// ---- 選択中のテーマのストア (useSyncExternalStore 用) ----
// localStorage は他のタブの変更しか storage イベントで知らせないので、同じタブの変更は自前で通知する

const listeners = new Set<() => void>()
// localStorage が使えない環境でも、このタブの中では選んだテーマを覚えておく
let memoryThemeId: BackgroundThemeId | null = null

export function subscribeBackgroundTheme(listener: () => void): () => void {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => {
    if (e.key === storageKey) listener()
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

export function getBackgroundThemeId(): BackgroundThemeId {
  try {
    const saved = window.localStorage.getItem(storageKey)
    if (isBackgroundThemeId(saved)) return saved
  } catch {
    // プライベートモードなどで localStorage が使えないときは、このタブで選んだものか既定に戻す
  }
  return memoryThemeId ?? defaultBackgroundThemeId
}

// サーバー描画とハイドレーション中は既定のテーマとして扱う
export function getServerBackgroundThemeId(): BackgroundThemeId {
  return defaultBackgroundThemeId
}

export function setBackgroundThemeId(id: BackgroundThemeId): void {
  memoryThemeId = id
  try {
    window.localStorage.setItem(storageKey, id)
  } catch {
    // 保存できなくても memoryThemeId で、このタブの中では切り替えられる
  }
  for (const listener of listeners) listener()
}
