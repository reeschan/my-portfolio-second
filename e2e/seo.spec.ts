import { ja } from "../data/messages/ja"
import { siteName, siteUrl } from "../lib/metadata"
import { navItems } from "../lib/navigation"
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

  test(
    "sitemap.xml はトップと印の付いていないタブのページを載せ、道具のページは載せない",
    { tag: ["@api-contract"], annotation: routes("/sitemap.xml") },
    async ({ request }) => {
      const res = await request.get("/sitemap.xml")
      expect(res.status()).toBe(200)
      const body = await res.text()

      const locs: string[] = []
      for (const match of body.matchAll(/<loc>([^<]+)<\/loc>/g)) {
        const loc = match[1]
        if (loc !== undefined) locs.push(loc)
      }

      // 絶対 URL はすべて正のホストで作る (www などを混ぜない)
      for (const loc of locs) {
        expect(new URL(loc).host, `正のホスト以外の URL が載っている: ${loc}`).toBe(siteUrl.host)
      }

      // トップと印の付いていないタブのページは載せる。期待値はタブの並びの定義から作る
      const fixedPaths = ["/", ...navItems.filter((item) => !item.utility).map((item) => item.href)]
      for (const path of fixedPaths) {
        expect(locs, `${path} が sitemap に無い`).toContain(new URL(path, siteUrl).href)
      }

      // 道具のページは索引に要らない (docs/specs/seo-stage2.md)
      for (const path of navItems.filter((item) => item.utility).map((item) => item.href)) {
        expect(locs, `${path} は道具のページなのに sitemap に載っている`).not.toContain(new URL(path, siteUrl).href)
      }

      // 固定のページは開ける。本番の URL には要求を送らず、パスを手元のサーバーに当てる
      for (const path of fixedPaths) {
        const pageRes = await request.get(path)
        expect(pageRes.status(), `${path} が ${pageRes.status()} を返した`).toBe(200)
      }
    },
  )
})
