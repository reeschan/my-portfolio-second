import { expect, routes, test } from "./fixtures"

// トップ (/) はサーバーで描き、登場の演出は CSS だけで付ける (PBI-0025)。
// 見出しと入口のリンクが JS を待たずに HTML に入っていること、視差効果を減らす設定で演出しないことを確かめる

test.describe("トップ: JS なしでも中身が出る", () => {
  // クローラーやリンクのプレビューは JS を動かさないことがあるので、JS を切って最初の HTML だけで確かめる
  test.use({ javaScriptEnabled: false })

  test("JS を切っても見出しと「Enter」のリンクが見える", { tag: ["@content", "@smoke"], annotation: routes("/") }, async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1, name: /Ryuki Tobita\s*Portfolio/ })).toBeVisible()
    await expect(page.getByRole("link", { name: "Enter" })).toHaveAttribute("href", "/overview")
  })
})

test.describe("トップ: 視差効果を減らす設定", () => {
  // OS で「視差効果を減らす」を選んだ人には、motion-safe: の演出を当てない
  test.use({ reducedMotion: "reduce" })

  test("視差効果を減らす設定では見出しに演出が付かない", { tag: ["@a11y"], annotation: routes("/") }, async ({ page }) => {
    await page.goto("/")
    const heading = page.getByRole("heading", { level: 1, name: /Ryuki Tobita\s*Portfolio/ })
    await expect(heading).toBeVisible()
    const animationName = await heading.evaluate((el) => getComputedStyle(el).animationName)
    expect(animationName).toBe("none")
  })
})
