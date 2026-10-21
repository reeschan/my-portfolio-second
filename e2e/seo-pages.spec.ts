import { ja } from "../data/messages/ja"
import { pageTitle, siteName, siteUrl } from "../lib/metadata"
import { navItems } from "../lib/navigation"
import { nowPostPath } from "../lib/now/feed"
import { createNowPost, expect, routes, test, uniqueTitle } from "./fixtures"

// 全ページの SEO の基本 (PBI-001、ADR 0033)。今の作りで通る範囲だけを確かめる。
// 見出しの段・構造化データ・noindex など 2 段目の残りは、後続の PBI が別のファイルに足す。
// 期待値は lib/ と data/ から作る (サイト名・タブ名・URL を二重に書かない)

// 検査に使う Page の一部だけを型で受ける。E2E は fixtures.ts の test・expect だけを import する決まりのため
type LocatorSource = {
  locator(selector: string): { getAttribute(name: string): Promise<string | null> }
}

// 自サイトの絶対 URL で出ていることを確かめる属性。canonical は href、meta は content に入る
const selfUrlAttributes = [
  { selector: 'link[rel="canonical"]', attribute: "href" },
  { selector: 'meta[property="og:url"]', attribute: "content" },
  { selector: 'meta[property="og:image"]', attribute: "content" },
  { selector: 'meta[name="twitter:image"]', attribute: "content" },
] as const

// canonical と OGP の URL を集める。相対のままだと SNS や検索エンジンが自サイトの URL として解決できない
async function selfUrlValues(page: LocatorSource): Promise<(string | null)[]> {
  return Promise.all(selfUrlAttributes.map(({ selector, attribute }) => page.locator(selector).getAttribute(attribute)))
}

// 自サイトの絶対 URL か。トップの og:image は app/opengraph-image.tsx のファイルの画像 (/opengraph-image?<hash>) になり、
// Next の dev サーバーはこれを metadataBase ではなくリクエストのホスト (localhost) で出す。本番と CI の本番ビルドは siteUrl で出す
// (2026-10-21 に本番を curl で確認) ので、手元の dev サーバーのときだけ、ファイルの画像に限ってテストサーバーのホストを認める
function isSelfUrl(value: string, pageUrl: string): boolean {
  if (value.startsWith(siteUrl.origin)) return true
  const url = new URL(value)
  return !process.env.CI && url.origin === new URL(pageUrl).origin && url.pathname === "/opengraph-image"
}

// ルートごとの title。トップはサイト名、タブのページは「タブ名 | サイト名」(lib/metadata.ts)
const pageRoutes = [{ path: "/", title: siteName }, ...navItems.map((item) => ({ path: item.href, title: pageTitle(ja.nav[item.id]) }))]

// canonical の期待値。トップは metadataBase (siteUrl) そのもので、Next は "/" を末尾スラッシュなしの origin に正規化する
function canonicalUrl(path: string): string {
  return path === "/" ? siteUrl.origin : new URL(path, siteUrl).href
}

test.describe("SEO: 全ページの基本", () => {
  for (const route of pageRoutes) {
    test(
      `${route.path} は title・canonical・自サイトの URL・h1 を持つ`,
      { tag: ["@seo"], annotation: routes(route.path) },
      async ({ page }) => {
        await page.goto(route.path)

        await expect(page).toHaveTitle(route.title)
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonicalUrl(route.path))

        for (const value of await selfUrlValues(page)) {
          expect(value, "自サイトの URL が空").not.toBeNull()
          expect(value !== null && isSelfUrl(value, page.url()), `自サイト以外の URL が出ている: ${value}`).toBe(true)
        }

        // ページの主題は h1 1 つに絞る (PageTemplate がタブ名を h1 で出す)
        await expect(page.locator("h1")).toHaveCount(1)
      },
    )
  }

  test(
    "記事ページは題名の title・canonical・自サイトの URL・h1 を持つ",
    { tag: ["@seo"], annotation: routes("/now/[id]") },
    async ({ page, request }) => {
      const title = uniqueTitle("SEO の記事")
      const { id } = await createNowPost(request, { title, body: "記事の本文です。" })
      const path = nowPostPath(id)

      const res = await page.goto(path)
      expect(res?.status()).toBe(200)

      // 記事の title は「題名 | サイト名」で、canonical は記事の URL (ADR 0030)
      await expect(page).toHaveTitle(pageTitle(title))
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonicalUrl(path))

      for (const value of await selfUrlValues(page)) {
        expect(value, "自サイトの URL が空").not.toBeNull()
        expect(value !== null && isSelfUrl(value, page.url()), `自サイト以外の URL が出ている: ${value}`).toBe(true)
      }

      await expect(page.locator("h1")).toHaveCount(1)
    },
  )
})
