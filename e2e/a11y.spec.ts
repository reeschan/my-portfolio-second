import AxeBuilder from "@axe-core/playwright"
import { expect, pages, routes, test } from "./fixtures"

// testing/e2e-policy.yml の a11y 観点。fail_on に挙げた重大度の違反があれば落とす
const failOn = ["critical", "serious"]

test.describe("アクセシビリティ (axe)", () => {
  for (const p of [{ path: "/" }, ...pages]) {
    test(`${p.path} に重大なアクセシビリティ違反がない`, { tag: "@a11y", annotation: routes(p.path) }, async ({ page }) => {
      await page.goto(p.path)
      await page.waitForLoadState("networkidle")

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        // 3D 背景の canvas は装飾なので対象外
        .exclude("canvas")
        .analyze()

      const blocking = results.violations
        .filter((v) => failOn.includes(v.impact ?? ""))
        .map((v) => `${v.impact}: ${v.id} (${v.nodes.length}箇所) ${v.help}`)

      expect(blocking).toEqual([])
    })
  }
})
