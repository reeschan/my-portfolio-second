import { ja } from "../data/messages/ja"
import { siteName, siteUrl } from "../lib/metadata"
import { expect, pages, routes, test } from "./fixtures"

// 検索エンジンと SNS に渡すメタデータ (PBI-0019、ADR 0029)
test.describe("SEO: タイトル・説明・canonical・OGP", () => {
  test("トップはサイト名とサイトの説明を持つ", { tag: ["@smoke"], annotation: routes("/") }, async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveTitle(siteName)
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", ja.site.description)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", siteUrl.origin)
  })

  for (const p of pages) {
    test(
      `${p.path} はページ固有のタイトル・説明・canonical・OGP 画像を持つ`,
      { tag: ["@smoke"], annotation: routes(p.path) },
      async ({ page }) => {
        await page.goto(p.path)
        await expect(page).toHaveTitle(`${p.tab} | ${siteName}`)
        await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /\S/)
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new URL(p.path, siteUrl).href)
        await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", new URL(p.path, siteUrl).href)
        // OGP の画像は本番の URL の絶対パスで指す (SNS が相対パスを読めないため)
        await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", new RegExp(`^${siteUrl.origin}/opengraph-image`))
        await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image")
      },
    )
  }

  test("OGP の画像が PNG で返る", { tag: ["@api-contract"], annotation: routes("/opengraph-image") }, async ({ request }) => {
    const res = await request.get("/opengraph-image")
    expect(res.status()).toBe(200)
    expect(res.headers()["content-type"]).toBe("image/png")
  })

  test("robots.txt が API を除き、sitemap を示す", { tag: ["@api-contract"], annotation: routes("/robots.txt") }, async ({ request }) => {
    const res = await request.get("/robots.txt")
    expect(res.status()).toBe(200)
    const body = await res.text()
    expect(body).toContain("Disallow: /api/")
    expect(body).toContain(`Sitemap: ${new URL("/sitemap.xml", siteUrl).href}`)
  })

  test("sitemap.xml にトップと全ページが載る", { tag: ["@api-contract"], annotation: routes("/sitemap.xml") }, async ({ request }) => {
    const res = await request.get("/sitemap.xml")
    expect(res.status()).toBe(200)
    const body = await res.text()
    for (const path of ["/", ...pages.map((p) => p.path)]) {
      expect(body).toContain(`<loc>${new URL(path, siteUrl).href}</loc>`)
    }
  })
})
