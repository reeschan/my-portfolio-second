// @coverage-map ignore 画面の文言の辞書の検査。ルートに紐づかない
import { describe, expect, it } from "vitest"
import { ja, type Messages } from "@/data/messages/ja"
import { en } from "@/data/messages/en"
import { pageTitle, siteName } from "@/lib/metadata"
import { navItems } from "@/lib/navigation"

// 検索結果の説明文として読める長さの範囲 (docs/specs/seo-stage2.md)。
// これより短いとページの中身が伝わらず、長いと検索結果で切れて読めない
const MIN_DESCRIPTION_LENGTH = 50
const MAX_DESCRIPTION_LENGTH = 120

// 検索結果の説明文になる description。トップの site と、タブのページの 8 つ
function descriptionsOf(messages: Messages): { label: string; text: string }[] {
  return [{ label: "site", text: messages.site.description }, ...navItems.map(({ id }) => ({ label: id, text: messages[id].description }))]
}

describe("画面の文言の辞書の SEO", () => {
  it("ja の説明文はどれも 50〜120 文字 (検索結果で切れずに読める長さ)", () => {
    for (const { label, text } of descriptionsOf(ja)) {
      const length = Array.from(text).length
      expect(length, `${label} の description が短すぎる`).toBeGreaterThanOrEqual(MIN_DESCRIPTION_LENGTH)
      expect(length, `${label} の description が長すぎる`).toBeLessThanOrEqual(MAX_DESCRIPTION_LENGTH)
    }
  })

  it("ja のページのタイトルは互いに違い、サイト名とも違う (検索結果でページを見分けられる)", () => {
    const titles = navItems.map(({ id }) => pageTitle(ja.nav[id]))
    expect(new Set(titles).size).toBe(titles.length)
    expect(titles).not.toContain(siteName)
  })

  it("en の説明文はどれも空でない", () => {
    for (const { label, text } of descriptionsOf(en)) {
      expect(text.trim(), `${label} の description が空`).not.toBe("")
    }
  })
})
