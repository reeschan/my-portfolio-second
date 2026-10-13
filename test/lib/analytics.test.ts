// @coverage-map ignore 全ページ共通のレイアウトで使う判定で、特定のルートに紐づかない
import { describe, expect, it } from "vitest"
import { isVercelAnalyticsEnabled } from "@/lib/analytics"

describe("isVercelAnalyticsEnabled", () => {
  it("Vercel 上 (VERCEL=1) では有効にする", () => {
    expect(isVercelAnalyticsEnabled({ VERCEL: "1" })).toBe(true)
  })

  it("Vercel 以外 (VERCEL が無い・1 以外) では有効にしない", () => {
    expect(isVercelAnalyticsEnabled({})).toBe(false)
    expect(isVercelAnalyticsEnabled({ VERCEL: "" })).toBe(false)
    expect(isVercelAnalyticsEnabled({ VERCEL: "0" })).toBe(false)
  })
})
