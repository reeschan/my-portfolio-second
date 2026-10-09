import type { APIRequestContext } from "@playwright/test"
import { expect, nowPostToken, routes, test } from "./fixtures"

// /now の記事 (PBI-0004)。記事は POST /api/now で仕込む (保存先は webServer のメモリ。playwright.config.ts)
// 並列のテストが同じサーバーに投稿するので、題名は毎回一意にし、件数や先頭の記事には頼らない

type Post = { title: string; body: string; publishedAt?: string }

const uniqueTitle = (label: string) => `${label} ${crypto.randomUUID().slice(0, 8)}`

async function createPost(request: APIRequestContext, post: Post) {
  const res = await request.post("/api/now", {
    headers: { Authorization: `Bearer ${nowPostToken}` },
    data: post,
  })
  expect(res.status(), await res.text()).toBe(201)
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
      // mermaid は読み込んでから描くので、SVG が差し込まれるのを待つ
      await expect(dialog.getByRole("figure", { name: "Mermaid の図" }).locator("svg")).toBeVisible()

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
})
