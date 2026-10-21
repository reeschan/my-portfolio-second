import { ja } from "../data/messages/ja"
import { siteName, siteUrl } from "../lib/metadata"
import { excerptOf } from "../lib/now/excerpt"
import { nowPostPath } from "../lib/now/feed"
import { postDescriptionLength } from "../lib/now/structured-data"
import { createNowPost, expect, routes, test, uniqueTitle } from "./fixtures"

// /now の記事 1 件のページ (PBI-004、ADR 0030)。記事は POST /api/now で仕込む (保存先は webServer のメモリ)
// 並列のテストが同じサーバーに投稿するので、題名は createNowPost / uniqueTitle で毎回一意にする
// 知らない id は page.goto で確かめない。console の読み込み失敗で自動フィクスチャがテストを落とすため、request.get のステータスで見る

test.describe("Now の記事ページ", () => {
  test(
    "記事ページで題名・本文・一覧へ戻るリンクが出て、タブの Now が選ばれる",
    { tag: ["@smoke"], annotation: routes("/now/[id]") },
    async ({ page, request }) => {
      const title = uniqueTitle("記事ページ")
      const { id } = await createNowPost(request, {
        title,
        body: "# 取り組み\n\n本文はサーバーで描かれます。",
      })

      const res = await page.goto(nowPostPath(id))
      expect(res?.status()).toBe(200)
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible()
      // 題名が h1 なので、本文の # は h2 になる
      await expect(page.getByRole("heading", { level: 2, name: "取り組み" })).toBeVisible()
      await expect(page.getByText("本文はサーバーで描かれます。")).toBeVisible()

      const nav = page.getByRole("navigation", { name: ja.layout.pages })
      await expect(nav.getByRole("link", { name: ja.nav.now, exact: true })).toHaveAttribute("aria-current", "page")

      const backToList = page.getByRole("link", { name: ja.now.backToList })
      await expect(backToList).toBeVisible()
      await expect(backToList).toHaveAttribute("href", "/now")
    },
  )

  test(
    "記事ページは記事ごとの title・description・canonical・OGP を持つ",
    { tag: ["@smoke"], annotation: routes("/now/[id]") },
    async ({ page, request }) => {
      const title = uniqueTitle("記事のメタデータ")
      const body = "## 近況\n\n**Next.js 16** に移行しています。"
      const publishedAt = "2026-10-09T10:00:00+09:00"
      const { id } = await createNowPost(request, { title, body, publishedAt })

      await page.goto(nowPostPath(id))
      await expect(page).toHaveTitle(`${title} | ${siteName}`)
      // 説明は本文の抜粋。期待値は本体と同じ excerptOf・postDescriptionLength で作る (数字を二重に書かない)
      await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", excerptOf(body, postDescriptionLength))
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new URL(nowPostPath(id), siteUrl).href)
      await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "article")
      await expect(page.locator('meta[property="article:published_time"]')).toHaveAttribute("content", new Date(publishedAt).toISOString())
    },
  )

  test(
    "記事ページの JSON-LD は BlogPosting で、題名を持つ",
    { tag: ["@smoke"], annotation: routes("/now/[id]") },
    async ({ page, request }) => {
      const title = uniqueTitle("構造化データ")
      const { id } = await createNowPost(request, { title, body: "JSON-LD の記事です。" })

      await page.goto(nowPostPath(id))
      // script は 2 つになる (レイアウトの WebSite・Person と、記事の BlogPosting)。
      // 1 つだけ取らず、すべて集めて @type で BlogPosting を探す
      const scripts = await page.locator('script[type="application/ld+json"]').allTextContents()
      const nodes = scripts.flatMap((text) => {
        const data = JSON.parse(text) as Record<string, unknown>
        const graph = data["@graph"]
        return Array.isArray(graph) ? (graph as Record<string, unknown>[]) : [data]
      })
      const blogPosting = nodes.find((node) => node["@type"] === "BlogPosting")
      expect(blogPosting, "BlogPosting の script が出ている").toBeDefined()
      expect(blogPosting?.headline).toBe(title)
    },
  )

  test(
    "JavaScript を動かさない応答にも記事の本文が入っている",
    { tag: ["@smoke"], annotation: routes("/now/[id]") },
    async ({ request }) => {
      const title = uniqueTitle("サーバー描画")
      const { id } = await createNowPost(request, { title, body: "JavaScript なしでも本文が読めます。" })

      const res = await request.get(nowPostPath(id))
      expect(res.status()).toBe(200)
      const html = await res.text()
      expect(html).toContain(title)
      expect(html).toContain("JavaScript なしでも本文が読めます。")
    },
  )

  test("知らない id の記事ページは 404 になる", { tag: "@interaction", annotation: routes("/now/[id]") }, async ({ request }) => {
    const res = await request.get(nowPostPath(crypto.randomUUID()))
    expect(res.status()).toBe(404)
  })
})
