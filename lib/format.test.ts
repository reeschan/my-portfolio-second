// @perspectives content
// @routes /now
import { describe, expect, it } from "vitest"
import { formatJapaneseDateTime } from "./format"

describe("formatJapaneseDateTime", () => {
  it("日本時間の日付で返す (UTC では前日でも日本では当日)", () => {
    expect(formatJapaneseDateTime("2026-10-08T15:30:00.000Z")).toBe("2026年10月9日")
  })

  it("年末年始の境目も日本時間で数える", () => {
    expect(formatJapaneseDateTime("2025-12-31T14:59:59.000Z")).toBe("2025年12月31日")
    expect(formatJapaneseDateTime("2025-12-31T15:00:00.000Z")).toBe("2026年1月1日")
  })

  it("日時として読めない文字列はそのまま返す", () => {
    expect(formatJapaneseDateTime("not-a-date")).toBe("not-a-date")
  })
})
