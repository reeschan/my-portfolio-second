import { expect, pages, routes, test } from "./fixtures"

test.describe("ナビゲーション", () => {
  test("トップの Enter から概要ページへ進める", { tag: ["@navigation", "@responsive"], annotation: routes("/", "/overview") }, async ({ page }) => {
    await page.goto("/")
    await page.getByRole("link", { name: "Enter" }).click()
    await expect(page).toHaveURL(/\/overview$/)
    await expect(page.getByRole("heading", { level: 1, name: "概要" })).toBeVisible()
  })

  test("タブを順にクリックして全ページを巡回できる", { tag: ["@navigation", "@responsive"], annotation: routes(...pages.map((p) => p.path)) }, async ({ page }) => {
    await page.goto("/overview")
    for (const p of pages) {
      await page.getByRole("link", { name: p.tab, exact: true }).click()
      await expect(page).toHaveURL(new RegExp(`${p.path}$`))
      await expect(page.getByRole("heading", { level: 1, name: p.heading })).toBeVisible()
    }
  })

  test("タブの並び順が 概要→経歴→スキル→ワーク→Now→チャット になっている", { tag: "@navigation", annotation: routes("/overview") }, async ({ page }) => {
    await page.goto("/overview")
    const names = pages.map((p) => p.tab)
    const tabLinks = page.getByRole("link").filter({ hasText: new RegExp(`^(${names.join("|")})$`) })
    await expect(tabLinks).toHaveText(names)
  })

  test("RSS ボタンがフィードを指している", { tag: "@navigation", annotation: routes("/overview") }, async ({ page }) => {
    await page.goto("/overview")
    await expect(page.getByRole("link", { name: "RSSフィード" })).toHaveAttribute("href", "/rss.xml")
  })

  test("お知らせバナーを閉じられる", { tag: "@interaction", annotation: routes("/overview") }, async ({ page }) => {
    await page.goto("/overview")
    const close = page.getByRole("button", { name: "お知らせを閉じる" })
    await expect(close).toBeVisible()
    await close.click()
    await expect(close).toBeHidden()
  })
})
