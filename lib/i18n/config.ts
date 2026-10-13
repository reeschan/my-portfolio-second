// 表示言語の一覧と、Cookie に残す言語の読み方 (ADR 0026)
// URL を言語ごとに分けず、選んだ言語を Cookie に残してサーバーが読む

export const locales = ["ja", "en"] as const
export type Locale = (typeof locales)[number]

// Cookie がない・壊れているときは日本語で出す (これまでの表示を変えない)
export const defaultLocale: Locale = "ja"

export const localeCookieName = "locale"

// 一度選んだ言語を次に開いたときも使えるよう、1 年残す
export const localeCookieMaxAge = 60 * 60 * 24 * 365

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value)
}

// Cookie の値は利用者が書き換えられるので、知らない値は既定の言語に倒す
export function resolveLocale(value: string | undefined): Locale {
  return isLocale(value) ? value : defaultLocale
}
