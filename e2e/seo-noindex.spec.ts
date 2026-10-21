import { navItems } from "../lib/navigation"
import { expect, routes, test } from "./fixtures"

// 道具のページ (読ませる中身を持たない設定や操作のためのページ) だけを索引から外す (docs/specs/seo-stage2.md、CONTEXT.md)。
// 期待値はタブの並びの定義の印から作り、ルートをこのファイルに写さない (PBI-004)

const utilityPaths = navItems.filter((item) => item.utility).map((item) => item.href)
// トップはタブの並びに無いので別に足す
const indexablePaths = ["/", ...navItems.filter((item) => !item.utility).map((item) => item.href)]

test.describe("SEO: 道具のページの noindex", () => {
  for (const path of utilityPaths) {
    test(`${path} は noindex を持つ`, { tag: ["@seo"], annotation: routes(path) }, async ({ page }) => {
      await page.goto(path)
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/)
    })
  }

  for (const path of indexablePaths) {
    test(`${path} は noindex を持たない`, { tag: ["@seo"], annotation: routes(path) }, async ({ page }) => {
      await page.goto(path)
      // robots の meta が無い場合も含め、noindex を含むものが 1 つも出ていないことを見る
      await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0)
    })
  }
})
