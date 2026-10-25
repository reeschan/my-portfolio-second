import { expect, routes, test } from "./fixtures"

// トップ (/) はサーバーで描き、見出しと入口のリンクを最初の HTML に含める (docs/specs/intro-complete.md)。
// 見出しは導入演出の最後のコマの名前で、文字が浮かぶまでは透明だが、Playwright は透明度を「見えない」と
// 判定しないので、JS を待たずに中身が出ていることをこのまま確かめられる。視差効果を減らす設定では演出しないことも確かめる

test.describe("トップ: JS なしでも中身が出る", () => {
  // クローラーやリンクのプレビューは JS を動かさないことがあるので、JS を切って最初の HTML だけで確かめる
  test.use({ javaScriptEnabled: false })

  test("JS を切っても見出しと「Enter」のリンクが見える", { tag: ["@content", "@smoke"], annotation: routes("/") }, async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1, name: /Ryuki Tobita\s+Portfolio/ })).toBeVisible()
    await expect(page.getByRole("link", { name: "Enter" })).toHaveAttribute("href", "/overview")
  })
})

test.describe("トップ: 視差効果を減らす設定", () => {
  // OS で「視差効果を減らす」を選んだ人には、見出しに登場のアニメーションを付けない
  test.use({ reducedMotion: "reduce" })

  test("視差効果を減らす設定では見出しの文字に演出が付かない", { tag: ["@a11y"], annotation: routes("/") }, async ({ page }) => {
    await page.goto("/")
    const heading = page.getByRole("heading", { level: 1, name: /Ryuki Tobita\s+Portfolio/ })
    await expect(heading).toBeVisible()
    // 名前は 1 文字ずつ浮かぶので、見出しの中のすべての要素にアニメーションが付いていないことを見る
    const animationNames = await heading.evaluate((el) =>
      [el, ...Array.from(el.querySelectorAll("*"))].map((node) => getComputedStyle(node).animationName),
    )
    expect(animationNames.every((name) => name === "none")).toBe(true)
  })
})
