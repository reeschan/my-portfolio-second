import { navItems } from "../lib/navigation"
import { expect, routes, test } from "./fixtures"

// testing/e2e-policy.yml の seo 観点のうち、見出しの段 (docs/specs/seo-stage2.md)。
// ページを開いた直後の DOM で、h1 の次に h3 が来るような段の飛びが無いことを確かめる。
// /now/[id] の記事の本文の見出しは別の PBI で扱うので、ここでは固定のページだけを見る。

// トップはタブの並びに無いので足す。期待値はタブの並びの定義から作り、ルートをこのファイルに写さない
const paths = ["/", ...navItems.map((item) => item.href)]

test.describe("SEO: 見出しの段", () => {
  for (const path of paths) {
    test(`${path} は見出しの段が飛ばない`, { tag: ["@seo"], annotation: routes(path) }, async ({ page }) => {
      await page.goto(path)
      // h1 が出るまで待ってから数える (初回のコンパイル中に空の一覧を数えない)
      await expect(page.locator("h1").first()).toBeVisible()

      // 開いたダイアログや隠れている見出しは数えない。ページを開いた直後の状態で比べる
      const headings = await page.locator("h1, h2, h3, h4, h5, h6").evaluateAll((nodes) =>
        nodes
          .filter((node) => {
            const el = node as HTMLElement
            return el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden"
          })
          .map((node) => ({ level: Number(node.tagName.slice(1)), text: (node.textContent ?? "").trim() })),
      )

      // 最初の見出しはページの主題の h1
      expect(headings[0]?.level, `最初の見出しが h1 でない: ${JSON.stringify(headings)}`).toBe(1)

      // 直前の見出しより 2 段以上深いものが無いこと (h1 → h3 を許さない)
      let previous = headings[0]?.level ?? 0
      for (const heading of headings.slice(1)) {
        expect(
          heading.level,
          `${path}: 「${heading.text}」が h${previous} の次に h${heading.level} で段が飛んでいる (${headings
            .map((h) => `h${h.level} ${h.text}`)
            .join(" → ")})`,
        ).toBeLessThanOrEqual(previous + 1)
        previous = heading.level
      }
    })
  }
})
