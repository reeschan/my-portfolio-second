// @perspectives content
// @routes /now
import { describe, expect, it } from "vitest"
import { formatJapaneseDate } from "./format"

describe("formatJapaneseDate", () => {
  it("ゼロ埋めを外して年月日で表す", () => {
    expect(formatJapaneseDate("2026-09-03")).toBe("2026年9月3日")
  })

  it("年末年始でもタイムゾーンの影響を受けない", () => {
    expect(formatJapaneseDate("2025-12-31")).toBe("2025年12月31日")
    expect(formatJapaneseDate("2026-01-01")).toBe("2026年1月1日")
  })

  it("形式が違う文字列はそのまま返す", () => {
    expect(formatJapaneseDate("2026/09/03")).toBe("2026/09/03")
  })
})
