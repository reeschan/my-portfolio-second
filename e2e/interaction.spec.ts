import { expect, routes, test } from "./fixtures"

test.describe("ページ内の操作", () => {
  test("経歴: 参画案件の詳細ダイアログを開いて閉じられる", { tag: ["@interaction", "@responsive"], annotation: routes("/career") }, async ({ page }) => {
    await page.goto("/career")
    await page.getByRole("button", { name: "参画案件の詳細" }).first().click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole("heading", { name: "参画案件の詳細" })).toBeVisible()

    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
  })

  test("経歴: 継続中の経歴に「継続中」バッジが出る", { tag: "@interaction", annotation: routes("/career") }, async ({ page }) => {
    await page.goto("/career")
    await expect(page.getByText("継続中", { exact: true }).first()).toBeVisible()
  })

  test("スキル: カテゴリのタブを切り替えられる", { tag: "@interaction", annotation: routes("/skills") }, async ({ page }) => {
    await page.goto("/skills")
    await expect(page.getByText("資格ハイライト")).toBeVisible()

    await page.getByRole("tab", { name: "AWS" }).click()
    await expect(page.getByRole("tab", { name: "AWS" })).toHaveAttribute("aria-selected", "true")
    await expect(page.getByText("AWSスキル (5段階評価)")).toBeVisible()
    await expect(page.getByText("資格ハイライト")).toBeHidden()
  })

  test("ワーク: ポートフォリオのカードから詳細ダイアログが開く", { tag: "@interaction", annotation: routes("/works") }, async ({ page }) => {
    await page.goto("/works")
    await page.getByRole("heading", { name: "ポートフォリオサイト" }).click()

    const dialog = page.getByRole("dialog", { name: "ポートフォリオサイト" })
    await expect(dialog).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
  })
})
