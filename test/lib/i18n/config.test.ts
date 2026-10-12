// @perspectives interaction
// @routes /overview
import { describe, expect, it } from "vitest"
import { defaultLocale, isLocale, resolveLocale } from "@/lib/i18n/config"

describe("resolveLocale", () => {
  it("ja と en はそのまま使う", () => {
    expect(resolveLocale("ja")).toBe("ja")
    expect(resolveLocale("en")).toBe("en")
  })

  it("Cookie がない・知らない値のときは既定の日本語にする", () => {
    expect(defaultLocale).toBe("ja")
    expect(resolveLocale(undefined)).toBe("ja")
    expect(resolveLocale("fr")).toBe("ja")
    expect(resolveLocale("EN")).toBe("ja")
  })
})

describe("isLocale", () => {
  it("文字列以外は言語として扱わない", () => {
    expect(isLocale(1)).toBe(false)
    expect(isLocale(null)).toBe(false)
    expect(isLocale({ toString: () => "en" })).toBe(false)
  })
})
