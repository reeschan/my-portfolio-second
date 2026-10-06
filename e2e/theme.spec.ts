import { expect, pages, routes, test } from "./fixtures"

// testing/e2e-policy.yml の theme 観点。テーマの正本は app/globals.css (docs/design/theme.md)
// 見た目のピクセル比較はしない。「既定テーマが当たっている」「トークンが定義され、画面がトークン経由で塗られている」を確かめる

// globals.css で定義しているトークン。消したり名前を変えたりしたらここで気づけるようにする
const requiredTokens = [
  "--background",
  "--foreground",
  "--card",
  "--primary",
  "--muted-foreground",
  "--border",
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--rss",
  "--radius",
]

test.describe("テーマ", () => {
  // OS がライトモードでも、サイトの既定はダークテーマ (layout.tsx の defaultTheme="dark")
  test.use({ colorScheme: "light" })

  for (const p of [{ path: "/" }, ...pages]) {
    test(`${p.path} はダークテーマで表示され、背景色がトークンから決まる`, { tag: "@theme", annotation: routes(p.path) }, async ({ page }) => {
      await page.goto(p.path)
      await expect(page.locator("html")).toHaveClass(/\bdark\b/)

      const result = await page.evaluate((tokens) => {
        const rootStyle = getComputedStyle(document.documentElement)
        const missing = tokens.filter((t) => rootStyle.getPropertyValue(t).trim() === "")
        // トークンで塗った見本の要素と body の背景色が一致するか (生の色を直書きしていないか)
        const probe = document.createElement("div")
        probe.style.backgroundColor = "hsl(var(--background))"
        document.body.appendChild(probe)
        const expected = getComputedStyle(probe).backgroundColor
        probe.remove()
        return { missing, expected, actual: getComputedStyle(document.body).backgroundColor }
      }, requiredTokens)

      expect(result.missing, "未定義のテーマトークン").toEqual([])
      expect(result.actual).toBe(result.expected)
    })
  }

  test("本文パネルはガラス調 (半透明 + 背景ぼかし) で、3D 背景が透けて見える", { tag: "@theme", annotation: routes("/overview") }, async ({ page }) => {
    await page.goto("/overview")
    // 見出しの直後にある本文パネル。CSS クラスではなく、見出しとの位置関係で取る
    const panel = page.getByRole("main").getByRole("heading", { level: 1 }).locator("xpath=following-sibling::div[1]")
    const style = await panel.evaluate((el) => {
      const s = getComputedStyle(el)
      return { backdrop: s.backdropFilter, background: s.backgroundColor }
    })
    expect(style.backdrop).toContain("blur")
    // 半透明 (アルファ付き) であること
    expect(style.background).toMatch(/rgba?\(.+[,/]\s*0?\.\d+\)|color\(.+\/\s*0?\.\d+\)/)
  })
})
