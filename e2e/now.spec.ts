import { createNowPost, expect, nowPostToken, routes, test, uniqueTitle } from "./fixtures"
import { ja } from "../data/messages/ja"
import { formatJapaneseDateTime } from "../lib/format"
import { siteUrl } from "../lib/metadata"
import { escapeXml, nowPostPath } from "../lib/now/feed"

// /now の記事 (PBI-0004)。記事は POST /api/now で仕込む (保存先は webServer のメモリ。playwright.config.ts)
// 並列のテストが同じサーバーに投稿するので、題名は毎回一意にし、件数や先頭の記事には頼らない

const auth = { Authorization: `Bearer ${nowPostToken}` }

test.describe("Now の記事", () => {
  test(
    "投稿した記事がカードで出て、日付と本文の抜粋が見える",
    { tag: ["@content", "@responsive"], annotation: routes("/now", "/api/now") },
    async ({ page, request }) => {
      const title = uniqueTitle("カード表示")
      await createNowPost(request, {
        title,
        body: "## 近況\n\n**Next.js 16** に移行しています。",
        publishedAt: "2026-10-09T10:00:00+09:00",
      })

      await page.goto("/now")
      const card = page.getByRole("article").filter({ has: page.getByRole("heading", { name: title }) })
      await expect(card).toBeVisible()
      await expect(card.getByText("2026年10月9日")).toBeVisible()
      // 抜粋は Markdown の記号を落とした平文
      await expect(card.getByText("近況 Next.js 16 に移行しています。")).toBeVisible()
    },
  )

  test(
    "Markdown のファイルを multipart/form-data で投稿すると、先頭の見出しが題名になってカードに出る (Postman 向け)",
    { tag: "@content", annotation: routes("/now", "/api/now") },
    async ({ page, request }) => {
      const title = uniqueTitle("ファイル投稿")
      const res = await request.post("/api/now", {
        headers: auth,
        multipart: {
          file: { name: "post.md", mimeType: "text/markdown", buffer: Buffer.from(`# ${title}\n\nファイルから投稿した本文です。`) },
        },
      })
      expect(res.status(), await res.text()).toBe(201)
      expect(await res.json()).toMatchObject({ title, body: "ファイルから投稿した本文です。" })

      await page.goto("/now")
      const card = page.getByRole("article").filter({ has: page.getByRole("heading", { name: title }) })
      await expect(card.getByText("ファイルから投稿した本文です。")).toBeVisible()
    },
  )

  test("記事は公開日の新しい順に並ぶ", { tag: "@content", annotation: routes("/now") }, async ({ page, request }) => {
    const older = uniqueTitle("古い記事")
    const newer = uniqueTitle("新しい記事")
    // 投稿の順と公開日の順を逆にして、投稿順ではなく公開日で並ぶことを確かめる
    await createNowPost(request, { title: newer, body: "新", publishedAt: "2999-01-02T00:00:00Z" })
    await createNowPost(request, { title: older, body: "旧", publishedAt: "2999-01-01T00:00:00Z" })

    await page.goto("/now")
    const titles = await page.getByRole("region", { name: "最近の投稿" }).getByRole("heading", { level: 2 }).allTextContents()
    expect(titles.indexOf(newer)).toBeGreaterThanOrEqual(0)
    expect(titles.indexOf(newer)).toBeLessThan(titles.indexOf(older))
  })

  test(
    "カードを押すと記事のページに移り、本文の Markdown と Mermaid の図が読める",
    { tag: ["@interaction", "@responsive"], annotation: routes("/now", "/now/[id]") },
    async ({ page, request }) => {
      const title = uniqueTitle("詳細表示")
      const { id } = await createNowPost(request, {
        title,
        body: [
          "# 取り組み",
          "",
          "- [x] 設計",
          "- [ ] 実装",
          "",
          "| 項目 | 状態 |",
          "| --- | --- |",
          "| API | 完了 |",
          "",
          "```mermaid",
          "flowchart LR",
          "  A[投稿] --> B[一覧]",
          "```",
          "",
          "[参考リンク](https://example.com)",
        ].join("\n"),
      })

      await page.goto("/now")
      // カード (見出しのリンク) から記事のページへ移る
      await page.getByRole("link", { name: title }).click()
      await expect(page).toHaveURL(new RegExp(`${nowPostPath(id)}$`))

      // 題名が h1 (PageTemplate) なので、本文の # は h2 から始まる
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible()
      await expect(page.getByRole("heading", { name: "取り組み" })).toBeVisible()
      await expect(page.getByRole("checkbox")).toHaveCount(2)
      await expect(page.getByRole("cell", { name: "完了" })).toBeVisible()
      await expect(page.getByRole("link", { name: "参考リンク" })).toHaveAttribute("target", "_blank")
      // mermaid は読み込んでから描くので、SVG が差し込まれるのを待つ。
      // dev サーバーは mermaid を初めて開いたときにコンパイルするため、既定の 5 秒では足りない
      await expect(page.getByRole("figure", { name: "Mermaid の図" }).locator("svg")).toBeVisible({ timeout: 30_000 })
    },
  )

  test(
    "トークンなしの投稿は 401 で弾かれ、一覧に出ない",
    { tag: "@interaction", annotation: routes("/api/now") },
    async ({ page, request }) => {
      const title = uniqueTitle("不正な投稿")
      const res = await request.post("/api/now", { data: { title, body: "本文" } })
      expect(res.status()).toBe(401)

      await page.goto("/now")
      await expect(page.getByRole("heading", { name: title })).toHaveCount(0)
    },
  )

  test(
    "PUT で直した記事は、記事のページに新しい題名と更新日が出る",
    { tag: "@interaction", annotation: routes("/now", "/api/now/[id]", "/now/[id]") },
    async ({ page, request }) => {
      const before = uniqueTitle("直す前")
      const after = uniqueTitle("直した後")
      const { id } = await createNowPost(request, { title: before, body: "誤字あり", publishedAt: "2026-01-01T00:00:00+09:00" })

      const res = await request.put(`/api/now/${id}`, { headers: auth, data: { title: after, body: "誤字なし" } })
      expect(res.status()).toBe(200)
      const { updatedAt } = (await res.json()) as { updatedAt: string }

      await page.goto("/now")
      await expect(page.getByRole("heading", { name: before })).toHaveCount(0)

      await page.goto(nowPostPath(id))
      await expect(page.getByRole("heading", { level: 1, name: after })).toBeVisible()
      await expect(page.getByText("誤字なし")).toBeVisible()
      // 公開日は元のまま、更新日が添えられる (文言は data/messages の dialogUpdatedBefore/After)
      await expect(
        page.getByText(`2026年1月1日${ja.now.dialogUpdatedBefore}${formatJapaneseDateTime(updatedAt)}${ja.now.dialogUpdatedAfter}`),
      ).toBeVisible()
    },
  )

  test(
    "DELETE で消した記事は一覧から消える",
    { tag: "@interaction", annotation: routes("/now", "/api/now/[id]") },
    async ({ page, request }) => {
      const title = uniqueTitle("消す記事")
      const { id } = await createNowPost(request, { title, body: "本文" })

      await page.goto("/now")
      await expect(page.getByRole("heading", { name: title })).toBeVisible()

      expect((await request.delete(`/api/now/${id}`, { headers: auth })).status()).toBe(204)
      await page.reload()
      await expect(page.getByRole("heading", { name: title })).toHaveCount(0)
    },
  )
})

// RSS フィード (PBI-0020)。記事は item になり、リンク (旧 ?post= の形も) から記事のページに着ける
test.describe("Now の RSS", () => {
  test(
    "投稿した記事が RSS の item に載り、リンクが記事のページを指す",
    { tag: "@api-contract", annotation: routes("/rss.xml") },
    async ({ request }) => {
      const title = uniqueTitle("RSS & 抜粋")
      const { id } = await createNowPost(request, { title, body: "**フィード**に載る本文です。" })

      const res = await request.get("/rss.xml")
      expect(res.status()).toBe(200)
      const xml = await res.text()
      // 題名の & は実体参照になる。期待値は本体と同じ escapeXml で作る (文字の置き換えを二重に書かない)
      expect(xml).toContain(`<title>${escapeXml(title)}</title>`)
      // チャンネル・自分自身・記事のリンクは、すべて正のホスト (siteUrl) の絶対 URL。
      // パスだけを見ると、ホストが転送元の apex に戻っても気付けない (PBI-0027)
      expect(xml).toContain(`<link>${new URL("/now", siteUrl).href}</link>`)
      expect(xml).toContain(`<atom:link href="${new URL("/rss.xml", siteUrl).href}" rel="self"`)
      // item のリンクは記事のページ (nowPostPath)
      expect(xml).toContain(`<link>${escapeXml(new URL(nowPostPath(id), siteUrl).href)}</link>`)
      expect(xml).toContain("<description>フィードに載る本文です。</description>")
    },
  )

  test(
    "旧リンク (/now?post=<id>) で開くと記事のページに移り、記事が出る",
    { tag: ["@interaction", "@responsive"], annotation: routes("/now", "/now/[id]") },
    async ({ page, request }) => {
      const title = uniqueTitle("RSS から開く")
      const { id } = await createNowPost(request, { title, body: "RSS から開いた本文です。" })

      await page.goto(`/now?post=${id}`)
      await expect(page).toHaveURL(new RegExp(`${nowPostPath(id)}$`))
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible()
      await expect(page.getByText("RSS から開いた本文です。")).toBeVisible()
    },
  )

  test(
    "旧リンクの ?post= は 308 Permanent で記事のページに転送する (知らない id も転送する)",
    { tag: "@interaction", annotation: routes("/now") },
    async ({ request }) => {
      // 知らない id は転送先の記事ページが 404 を返す。page.goto だと 404 の console エラーで自動フィクスチャが落ちるので request で見る
      const res = await request.get("/now?post=does-not-exist", { maxRedirects: 0 })
      expect(res.status()).toBe(308)
      expect(res.headers()["location"]).toMatch(/\/now\/does-not-exist$/)
    },
  )

  test("どのページもフィードの場所を link rel=alternate で示す", { tag: "@smoke", annotation: routes("/overview") }, async ({ page }) => {
    await page.goto("/overview")
    await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute("href", /\/rss\.xml$/)
  })
})
