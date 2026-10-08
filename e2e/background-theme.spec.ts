import { backgroundThemes, defaultBackgroundThemeId } from "../lib/background-theme"
import { expect, routes, test } from "./fixtures"

// /theme で 3D 背景のテーマを選ぶ (docs/pbi/0002-background-themes)。
// 描画結果のピクセルは比べず、「どのテーマのシーンが載っているか」を背景の枠の data-background-theme で確かめる
const canvasSelector = "[data-background-theme]"

test.describe("背景テーマ", () => {
  test("テーマの一覧が data の並びどおりに出て、既定のテーマが選ばれている", { tag: ["@content", "@responsive"], annotation: routes("/theme") }, async ({ page }) => {
    await page.goto("/theme")
    const group = page.getByRole("group", { name: "背景のテーマ" })
    await expect(group.getByRole("radio")).toHaveCount(backgroundThemes.length)

    for (const theme of backgroundThemes) {
      const radio = group.getByRole("radio", { name: theme.label })
      await expect(radio).toBeAttached()
      await expect(radio).toHaveAccessibleDescription(theme.description)
    }
    const defaultLabel = backgroundThemes.find((t) => t.id === defaultBackgroundThemeId)!.label
    await expect(group.getByRole("radio", { name: defaultLabel })).toBeChecked()
    await expect(page.locator(canvasSelector)).toHaveAttribute("data-background-theme", defaultBackgroundThemeId)
  })

  test("テーマを選ぶと背景のシーンが切り替わる", { tag: ["@interaction", "@responsive"], annotation: routes("/theme") }, async ({ page }) => {
    await page.goto("/theme")
    const group = page.getByRole("group", { name: "背景のテーマ" })

    for (const theme of backgroundThemes) {
      await group.getByText(theme.label, { exact: true }).click()
      await expect(group.getByRole("radio", { name: theme.label })).toBeChecked()
      await expect(page.locator(canvasSelector)).toHaveAttribute("data-background-theme", theme.id)
    }
  })

  test("矢印キーでもテーマを選べる", { tag: "@interaction", annotation: routes("/theme") }, async ({ page }) => {
    await page.goto("/theme")
    const group = page.getByRole("group", { name: "背景のテーマ" })
    await group.getByRole("radio", { name: backgroundThemes[0].label }).focus()
    await page.keyboard.press("ArrowDown")
    await expect(group.getByRole("radio", { name: backgroundThemes[1].label })).toBeChecked()
    await expect(page.locator(canvasSelector)).toHaveAttribute("data-background-theme", backgroundThemes[1].id)
  })

  test("選んだテーマは他のページに移っても、再読み込みしても残る", { tag: ["@interaction", "@navigation"], annotation: routes("/theme", "/overview") }, async ({ page }) => {
    const moon = backgroundThemes.find((t) => t.id === "moonlit-sea")!
    await page.goto("/theme")
    await page.getByRole("group", { name: "背景のテーマ" }).getByText(moon.label, { exact: true }).click()
    await expect(page.locator(canvasSelector)).toHaveAttribute("data-background-theme", moon.id)

    await page.getByRole("link", { name: "概要", exact: true }).click()
    await expect(page.getByRole("heading", { level: 1, name: "概要" })).toBeVisible()
    await expect(page.locator(canvasSelector)).toHaveAttribute("data-background-theme", moon.id)

    await page.reload()
    await expect(page.locator(canvasSelector)).toHaveAttribute("data-background-theme", moon.id)
  })

  // 新しいテーマはどれもシェーダーを使うので、全テーマを実際に描かせてエラー (シェーダーのコンパイル失敗など) が出ないことを確かめる。
  // console.error と未捕捉例外は fixtures の自動検査が拾う
  for (const theme of backgroundThemes) {
    test(`「${theme.label}」のシーンがエラーなく描画される`, { tag: "@smoke", annotation: routes("/theme") }, async ({ page }) => {
      test.setTimeout(120_000)
      await page.addInitScript((id) => window.localStorage.setItem("background-theme", id), theme.id)
      await page.goto("/theme")
      const el = page.locator(canvasSelector)
      await expect(el).toHaveAttribute("data-background-theme", theme.id)
      // テーマのシーンは遅延読み込みなので、canvas が出るまで長めに待つ。
      // CI のヘッドレス Chromium は WebGL をソフトウェア (SwiftShader) で描くため、重いシェーダーは 1 フレームに数秒かかる
      await expect(el.locator("canvas")).toBeVisible({ timeout: 30_000 })
      // シェーダーのコンパイルと 2 フレームの描画を待つ (固定の待ち時間ではなく、描画が進んだことを確かめる)
      await expect
        .poll(() => page.evaluate(() => new Promise<number>((r) => requestAnimationFrame(() => requestAnimationFrame((t) => r(t))))), {
          timeout: 60_000,
        })
        .toBeGreaterThan(0)
    })
  }
})
