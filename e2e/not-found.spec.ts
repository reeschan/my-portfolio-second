import { en } from "../data/messages/en"
import { ja } from "../data/messages/ja"
import { localeCookieName } from "../lib/i18n/config"
import { pageTitle } from "../lib/metadata"
import { expect, routes, test } from "./fixtures"

// 404 のページ (PBI-010、docs/specs/seo-stage2.md)。
// カバレッジの表に 404 の行が無いので、annotation は入口のトップに付けている。
// 知らない記事の URL は /now/[id] の入口として扱う。
// 期待値の文言は data/messages/ から読み、二重に書かない。

// 知らない URL は毎回変える。実際のページやほかのテストとぶつからないようにする
const unknownPagePath = () => `/no-such-page-${crypto.randomUUID()}`
const unknownPostPath = () => `/now/${crypto.randomUUID()}`

// 404 に canonical や og:url があると、検索エンジンが正のページと取り違える。
// ステータスは request.get でしか見られないので、無いことは応答の HTML で確かめる
function expectNoPositivePageSignals(html: string) {
  expect(html.includes('rel="canonical"'), "404 に canonical が出ている").toBe(false)
  expect(html.includes('property="og:url"'), "404 に og:url が出ている").toBe(false)
}

// og は 404 の文言に替わるが、twitter は親の題と説明を残していた (PBI-0036)
function expectTwitterMatchesNotFound(html: string) {
  expect(metaContent(html, "twitter:title")).toBe(pageTitle(ja.notFound.title))
  expect(metaContent(html, "twitter:description")).toBe(ja.notFound.body)
}

test(
  "SEO: 存在しない URL は 404 で、canonical も og:url も持たず、トップ・Now・ワークへの導線がある",
  { tag: ["@seo"], annotation: routes("/") },
  async ({ request }) => {
    const res = await request.get(unknownPagePath())
    expect(res.status()).toBe(404)

    const html = await res.text()
    expect(html).toContain(ja.notFound.heading)
    expectNoPositivePageSignals(html)
    expectTwitterMatchesNotFound(html)
    for (const href of ["/", "/now", "/works"]) {
      expect(html.includes(`href="${href}"`), `${href} への導線が無い`).toBe(true)
    }
  },
)

test(
  "SEO: 知らない id の記事の URL も同じ 404 で、canonical も og:url も持たない",
  { tag: ["@seo"], annotation: routes("/now/[id]") },
  async ({ request }) => {
    const res = await request.get(unknownPostPath())
    expect(res.status()).toBe(404)

    // 記事のページの notFound() から来ても、存在しない URL と同じ 404 のページが出る
    const html = await res.text()
    expect(html).toContain(ja.notFound.heading)
    expectNoPositivePageSignals(html)
    expectTwitterMatchesNotFound(html)
  },
)

test.describe("SEO: 404 をページとして開く", () => {
  // 存在しない URL を開くと、ブラウザが 404 の読み込みを console のエラーとして出す。
  // 意図して起こすエラーなので、この describe の中だけで許す
  test.use({ allowedConsoleErrors: [/status of 404/] })

  test("ja: タブ付きの枠の中に h1 と 3 つの導線が出て、title は 1 つ", { tag: ["@seo"], annotation: routes("/") }, async ({ page }) => {
    await page.goto(unknownPagePath())

    await expect(page.getByRole("navigation", { name: ja.layout.pages })).toBeVisible()
    await expect(page.getByRole("heading", { level: 1, name: ja.notFound.heading })).toBeVisible()
    await expect(page.getByRole("link", { name: ja.notFound.home })).toHaveAttribute("href", "/")
    await expect(page.getByRole("link", { name: ja.notFound.now })).toHaveAttribute("href", "/now")
    await expect(page.getByRole("link", { name: ja.notFound.works })).toHaveAttribute("href", "/works")

    // metadata が二重に混ざると title が 2 つになる。1 つだけ出ていることを見る
    await expect(page.locator("title")).toHaveCount(1)
    await expect(page).toHaveTitle(pageTitle(ja.notFound.title))
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute("content", pageTitle(ja.notFound.title))
    await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute("content", ja.notFound.body)
  })

  test(
    "en: locale=en の Cookie で開くと、英語の見出しと導線が出る",
    { tag: ["@seo"], annotation: routes("/") },
    async ({ page, baseURL }) => {
      if (!baseURL) throw new Error("baseURL が設定されていない")
      // ほかのページの英語の検査 (e2e/i18n.spec.ts) と同じ入れ方で Cookie を置く
      await page.context().addCookies([{ name: localeCookieName, value: "en", url: baseURL }])
      await page.goto(unknownPagePath())

      await expect(page.getByRole("heading", { level: 1, name: en.notFound.heading })).toBeVisible()
      await expect(page.getByRole("link", { name: en.notFound.home })).toHaveAttribute("href", "/")
      await expect(page.getByRole("link", { name: en.notFound.now })).toHaveAttribute("href", "/now")
      await expect(page.getByRole("link", { name: en.notFound.works })).toHaveAttribute("href", "/works")
      await expect(page).toHaveTitle(pageTitle(en.notFound.title))
      await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute("content", pageTitle(en.notFound.title))
      await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute("content", en.notFound.body)
    },
  )
})

// メタタグの content を取る。属性の並びと、アポストロフィのエスケープは応答によって変わる
function metaContent(html: string, name: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? []
  for (const tag of tags) {
    if (attr(tag, "name") !== name) continue
    const content = attr(tag, "content")
    return content === null ? null : decodeMeta(content)
  }
  return null
}

function attr(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\b${name}="([^"]*)"`))
  return match?.[1] ?? null
}

function decodeMeta(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&#x27;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&quot;", '"')
}
