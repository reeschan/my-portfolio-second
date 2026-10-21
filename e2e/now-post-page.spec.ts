import AxeBuilder from "@axe-core/playwright"
import type { APIRequestContext } from "@playwright/test"
import { ja } from "../data/messages/ja"
import { siteName, siteUrl } from "../lib/metadata"
import { excerptOf } from "../lib/now/excerpt"
import { nowPostPath } from "../lib/now/feed"
import { PostImageIssueCode } from "../lib/now/post-images"
import { postDescriptionLength } from "../lib/now/structured-data"
import { createNowPost, createNowPostWithImages, expect, postNowPostWithImages, routes, test, uniqueTitle } from "./fixtures"

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

// 記事の画像 (PBI-0024、ADR 0031)。webServer は NOW_POSTS_STORE=memory なので、画像の置き場もメモリになり、画像の URL は data: になる
const svgOf = (fill: string) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20" viewBox="0 0 40 20"><rect width="40" height="20" fill="${fill}"/></svg>`,
  )
// 1×1 の最小の PNG
const tinyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64")

const diagramAlt = "構成図"
const photoAlt = "写真"
const imagePostBody = `## 画像の記事\n\n![${diagramAlt}](diagram-light.svg)\n\n![${photoAlt}](./photo.png)\n`
const imageUploads = [
  { name: "diagram-light.svg", mimeType: "image/svg+xml", buffer: svgOf("#ffffff") },
  { name: "diagram-dark.svg", mimeType: "image/svg+xml", buffer: svgOf("#000000") },
  { name: "photo.png", mimeType: "image/png", buffer: tinyPng },
]

const enlargeLabel = (alt: string) => `${ja.imageViewer.enlargeImage}: ${alt}`

async function createImagePost(request: APIRequestContext, label: string) {
  const title = uniqueTitle(label)
  const post = await createNowPostWithImages(request, { title, body: imagePostBody, images: imageUploads })
  const urlOf = (name: string) => post.images.find((image) => image.name === name)?.url
  return { title, id: post.id, lightUrl: urlOf("diagram-light.svg"), darkUrl: urlOf("diagram-dark.svg"), pngUrl: urlOf("photo.png") }
}

test.describe("Now の記事の画像", () => {
  test(
    "light/dark の組はテーマに合う方だけが見え、組の無い PNG は 1 枚出る",
    { tag: "@interaction", annotation: routes("/now/[id]") },
    async ({ page, request }) => {
      const { id, lightUrl, darkUrl, pngUrl } = await createImagePost(request, "画像の出し分け")
      expect(lightUrl).toMatch(/^data:/)
      expect(darkUrl).toMatch(/^data:/)

      // 既定のテーマはダーク (app/layout.tsx の defaultTheme)
      await page.goto(nowPostPath(id))
      const pair = page.getByRole("button", { name: enlargeLabel(diagramAlt) }).locator("img")
      await expect(pair).toHaveCount(2)
      await expect(pair.nth(0)).toHaveAttribute("src", lightUrl!)
      await expect(pair.nth(0)).toBeHidden()
      await expect(pair.nth(1)).toHaveAttribute("src", darkUrl!)
      await expect(pair.nth(1)).toBeVisible()
      for (const index of [0, 1]) {
        await expect(pair.nth(index)).toHaveAttribute("width", "40")
        await expect(pair.nth(index)).toHaveAttribute("height", "20")
      }
      // 読み上げにも見える方の 1 枚だけが出る
      await expect(page.getByRole("img", { name: diagramAlt })).toHaveCount(1)

      const png = page.getByRole("button", { name: enlargeLabel(photoAlt) }).locator("img")
      await expect(png).toHaveCount(1)
      await expect(png).toBeVisible()
      await expect(png).toHaveAttribute("src", pngUrl!)
      await expect(png).toHaveAttribute("width", "1")
      await expect(png).toHaveAttribute("height", "1")
    },
  )

  test("ライトのテーマでは light の方だけが見える", { tag: "@interaction", annotation: routes("/now/[id]") }, async ({ page, request }) => {
    const { id } = await createImagePost(request, "ライトの画像")
    // next-themes はテーマを localStorage の theme に持つ
    await page.addInitScript(() => window.localStorage.setItem("theme", "light"))
    await page.goto(nowPostPath(id))
    const pair = page.getByRole("button", { name: enlargeLabel(diagramAlt) }).locator("img")
    await expect(pair.nth(0)).toBeVisible()
    await expect(pair.nth(1)).toBeHidden()
  })

  test(
    "画像を押すと拡大表示が開き、倍率を変えられ、Escape で閉じると画像のボタンにフォーカスが戻る",
    { tag: "@interaction", annotation: routes("/now/[id]") },
    async ({ page, request }) => {
      const { title, id } = await createImagePost(request, "画像の拡大")
      await page.goto(nowPostPath(id))
      const button = page.getByRole("button", { name: enlargeLabel(diagramAlt) })
      await button.click()

      const viewer = page.getByRole("dialog", { name: ja.now.imageViewerTitle(title) })
      await expect(viewer).toBeVisible()
      await expect(viewer.getByRole("img", { name: diagramAlt })).toBeVisible()
      const level = viewer.getByRole("status", { name: ja.imageViewer.zoomLevel })
      await expect(level).toHaveText("100%")
      await viewer.getByRole("button", { name: ja.imageViewer.zoomIn, exact: true }).click()
      await expect(level).toHaveText("150%")
      // data: URL はブラウザが新しいタブで開くのを拒むので、元の画像を開くリンクは出ない
      await expect(viewer.getByRole("link", { name: ja.imageViewer.openOriginal })).toHaveCount(0)

      await page.keyboard.press("Escape")
      await expect(viewer).toBeHidden()
      await expect(button).toBeFocused()
    },
  )

  test(
    "画像つきの記事ページに重大なアクセシビリティ違反がない",
    { tag: "@a11y", annotation: routes("/now/[id]") },
    async ({ page, request }) => {
      const { id } = await createImagePost(request, "画像の a11y")
      await page.goto(nowPostPath(id))
      await page.waitForLoadState("networkidle")

      // e2e/a11y.spec.ts と同じ条件 (WCAG 2 A/AA、critical・serious で落とす、3D 背景の canvas は対象外)
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).exclude("canvas").analyze()
      const blocking = results.violations
        .filter((v) => ["critical", "serious"].includes(v.impact ?? ""))
        .map((v) => `${v.impact}: ${v.id} (${v.nodes.length}箇所) ${v.help}`)
      expect(blocking).toEqual([])
    },
  )

  test("外部の画像を参照する本文の投稿は 400 になる", { tag: "@api-contract", annotation: routes("/api/now") }, async ({ request }) => {
    const res = await postNowPostWithImages(request, {
      title: uniqueTitle("外部の画像"),
      body: "![外部の図](https://example.com/diagram.png)\n",
      images: [],
    })
    expect(res.status()).toBe(400)
    const json = (await res.json()) as { issues?: { code: string }[] }
    expect(json.issues?.map((issue) => issue.code)).toContain(PostImageIssueCode.external)
  })
})
