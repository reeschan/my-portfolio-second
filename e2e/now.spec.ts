import type { APIRequestContext } from "@playwright/test"
import { expect, nowPostToken, routes, test } from "./fixtures"
import { formatJapaneseDateTime } from "../lib/format"

// /now の記事 (PBI-0004)。記事は POST /api/now で仕込む (保存先は webServer のメモリ。playwright.config.ts)
// 並列のテストが同じサーバーに投稿するので、題名は毎回一意にし、件数や先頭の記事には頼らない

type Post = { title: string; body: string; publishedAt?: string }

const uniqueTitle = (label: string) => `${label} ${crypto.randomUUID().slice(0, 8)}`

const auth = { Authorization: `Bearer ${nowPostToken}` }

async function createPost(request: APIRequestContext, post: Post): Promise<{ id: string }> {
  const res = await request.post("/api/now", {
    headers: auth,
    data: post,
  })
  expect(res.status(), await res.text()).toBe(201)
  return (await res.json()) as { id: string }
}

test.describe("Now の記事", () => {
  test(
    "投稿した記事がカードで出て、日付と本文の抜粋が見える",
    { tag: ["@content", "@responsive"], annotation: routes("/now", "/api/now") },
    async ({ page, request }) => {
      const title = uniqueTitle("カード表示")
      await createPost(request, {
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
    await createPost(request, { title: newer, body: "新", publishedAt: "2999-01-02T00:00:00Z" })
    await createPost(request, { title: older, body: "旧", publishedAt: "2999-01-01T00:00:00Z" })

    await page.goto("/now")
    const titles = await page.getByRole("region", { name: "最近の投稿" }).getByRole("heading", { level: 2 }).allTextContents()
    expect(titles.indexOf(newer)).toBeGreaterThanOrEqual(0)
    expect(titles.indexOf(newer)).toBeLessThan(titles.indexOf(older))
  })

  test(
    "カードを押すとダイアログで Markdown と Mermaid の図が読め、閉じられる",
    { tag: ["@interaction", "@responsive"], annotation: routes("/now") },
    async ({ page, request }) => {
      const title = uniqueTitle("詳細表示")
      await createPost(request, {
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
      await page.getByRole("button", { name: title }).click()

      const dialog = page.getByRole("dialog", { name: title })
      await expect(dialog).toBeVisible()
      await expect(dialog.getByRole("heading", { name: "取り組み" })).toBeVisible()
      await expect(dialog.getByRole("checkbox")).toHaveCount(2)
      await expect(dialog.getByRole("cell", { name: "完了" })).toBeVisible()
      await expect(dialog.getByRole("link", { name: "参考リンク" })).toHaveAttribute("target", "_blank")
      // mermaid は読み込んでから描くので、SVG が差し込まれるのを待つ。
      // dev サーバーは mermaid を初めて開いたときにコンパイルするため、既定の 5 秒では足りない
      await expect(dialog.getByRole("figure", { name: "Mermaid の図" }).locator("svg")).toBeVisible({ timeout: 30_000 })

      await page.keyboard.press("Escape")
      await expect(dialog).toBeHidden()
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
    "PUT で直した記事は題名と本文が変わり、更新日が出る",
    { tag: "@interaction", annotation: routes("/now", "/api/now/[id]") },
    async ({ page, request }) => {
      const before = uniqueTitle("直す前")
      const after = uniqueTitle("直した後")
      const { id } = await createPost(request, { title: before, body: "誤字あり", publishedAt: "2026-01-01T00:00:00+09:00" })

      const res = await request.put(`/api/now/${id}`, { headers: auth, data: { title: after, body: "誤字なし" } })
      expect(res.status()).toBe(200)
      const { updatedAt } = (await res.json()) as { updatedAt: string }

      await page.goto("/now")
      await expect(page.getByRole("heading", { name: before })).toHaveCount(0)
      await page.getByRole("button", { name: after }).click()

      const dialog = page.getByRole("dialog", { name: after })
      await expect(dialog.getByText("誤字なし")).toBeVisible()
      // 公開日は元のまま、更新日が添えられる
      await expect(dialog).toHaveAccessibleDescription(`2026年1月1日（${formatJapaneseDateTime(updatedAt)}更新）`)
    },
  )

  test(
    "DELETE で消した記事は一覧から消える",
    { tag: "@interaction", annotation: routes("/now", "/api/now/[id]") },
    async ({ page, request }) => {
      const title = uniqueTitle("消す記事")
      const { id } = await createPost(request, { title, body: "本文" })

      await page.goto("/now")
      await expect(page.getByRole("heading", { name: title })).toBeVisible()

      expect((await request.delete(`/api/now/${id}`, { headers: auth })).status()).toBe(204)
      await page.reload()
      await expect(page.getByRole("heading", { name: title })).toHaveCount(0)
    },
  )
})

// RSS フィード (PBI-0020)。記事は item になり、そのリンクから記事のダイアログを開ける
test.describe("Now の RSS", () => {
  test(
    "投稿した記事が RSS の item に載り、リンクが /now?post=<id> を指す",
    { tag: "@api-contract", annotation: routes("/rss.xml") },
    async ({ request }) => {
      const title = uniqueTitle("RSS & 抜粋")
      const { id } = await createPost(request, { title, body: "**フィード**に載る本文です。" })

      const res = await request.get("/rss.xml")
      expect(res.status()).toBe(200)
      const xml = await res.text()
      // 題名の & は実体参照になる
      expect(xml).toContain(`<title>${title.replace("&", "&amp;")}</title>`)
      expect(xml).toContain(`/now?post=${id}</link>`)
      expect(xml).toContain("<description>フィードに載る本文です。</description>")
    },
  )

  test(
    "RSS のリンク (/now?post=<id>) で開くと記事のダイアログが開き、閉じると ?post= が消える",
    { tag: ["@interaction", "@responsive"], annotation: routes("/now") },
    async ({ page, request }) => {
      const title = uniqueTitle("RSS から開く")
      const { id } = await createPost(request, { title, body: "RSS から開いた本文です。" })

      await page.goto(`/now?post=${id}`)
      const dialog = page.getByRole("dialog", { name: title })
      await expect(dialog.getByText("RSS から開いた本文です。")).toBeVisible()

      await page.keyboard.press("Escape")
      await expect(dialog).toBeHidden()
      await expect(page).toHaveURL(/\/now$/)
    },
  )

  test("知らない id で開いたときはダイアログを出さず一覧を出す", { tag: "@interaction", annotation: routes("/now") }, async ({ page }) => {
    await page.goto("/now?post=does-not-exist")
    await expect(page.getByRole("heading", { level: 1, name: "Now" })).toBeVisible()
    await expect(page.getByRole("dialog")).toHaveCount(0)
  })

  test("どのページもフィードの場所を link rel=alternate で示す", { tag: "@smoke", annotation: routes("/overview") }, async ({ page }) => {
    await page.goto("/overview")
    await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute("href", /\/rss\.xml$/)
  })
})
