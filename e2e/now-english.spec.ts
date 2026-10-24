import { en } from "../data/messages/en"
import { localeCookieName } from "../lib/i18n/config"
import { siteName } from "../lib/metadata"
import { nowPostPath } from "../lib/now/feed"
import { createNowPost, expect, nowPostToken, putNowPostEnglish, routes, test, uniqueTitle } from "./fixtures"

// /now の記事の英語版 (PBI-009、ADR 0037)。webServer には MOONSHOT_API_KEY が無いので自動訳は付かない。
// 英語版は持ち主の訳を PUT /api/now/[id]/en で仕込み、表示言語は Cookie で英語にする (e2e/i18n.spec.ts と同じ)
// 記事は同じサーバーに並列で投稿されるので、題名は uniqueTitle で毎回一意にする

test.describe("Now の記事の英語版", () => {
  test(
    "英語の Cookie で開くと、持ち主の訳のカードに英語の題名と本文の抜粋が出て、日本語のみの印が無い",
    { tag: "@content", annotation: routes("/now") },
    async ({ page, request, baseURL }) => {
      if (!baseURL) throw new Error("baseURL が設定されていない")
      const title = uniqueTitle("英語版のカード")
      const englishTitle = `${title} (EN)`
      const englishBody = "This body was written in English by the owner."
      const { id } = await createNowPost(request, { title, body: "日本語の本文です。" })
      await putNowPostEnglish(request, id, { title: englishTitle, body: englishBody })

      await page.context().addCookies([{ name: localeCookieName, value: "en", url: baseURL }])
      await page.goto("/now")

      const card = page.getByRole("article").filter({ has: page.getByRole("heading", { name: englishTitle }) })
      await expect(card).toBeVisible()
      await expect(card.getByRole("heading", { level: 2, name: englishTitle })).toBeVisible()
      // 抜粋は英語版の本文から作られる (日本語の本文ではない)
      await expect(card.getByText(englishBody)).toBeVisible()
      // 持ち主の訳なので「日本語のみ」の印は出ない
      await expect(card.getByText(en.now.japaneseOnlyBadge)).toHaveCount(0)
    },
  )

  test(
    "英語の Cookie で記事のページを開くと、h1・本文・title が英語で、断り書きが出ない",
    { tag: ["@content", "@seo"], annotation: routes("/now/[id]") },
    async ({ page, request, baseURL }) => {
      if (!baseURL) throw new Error("baseURL が設定されていない")
      const title = uniqueTitle("英語版の記事ページ")
      const englishTitle = `${title} (EN)`
      const englishBody = "The whole post is readable in English."
      const { id } = await createNowPost(request, { title, body: "日本語の本文です。" })
      await putNowPostEnglish(request, id, { title: englishTitle, body: englishBody })

      await page.context().addCookies([{ name: localeCookieName, value: "en", url: baseURL }])
      await page.goto(nowPostPath(id))

      await expect(page.getByRole("heading", { level: 1, name: englishTitle })).toBeVisible()
      await expect(page.getByText(englishBody)).toBeVisible()
      await expect(page).toHaveTitle(`${englishTitle} | ${siteName}`)
      // 持ち主の訳なので、日本語のみの断り書きも機械翻訳の断り書きも出ない
      await expect(page.getByText(en.now.japaneseOnlyNote)).toHaveCount(0)
      await expect(page.getByText(en.now.machineTranslatedNote)).toHaveCount(0)
    },
  )

  test(
    "日本語 (Cookie なし) で同じ記事を開くと、h1 は日本語の題名",
    { tag: "@content", annotation: routes("/now/[id]") },
    async ({ page, request }) => {
      const title = uniqueTitle("日本語の記事ページ")
      const englishTitle = `${title} (EN)`
      const { id } = await createNowPost(request, { title, body: "日本語の本文です。" })
      await putNowPostEnglish(request, id, { title: englishTitle, body: "English body." })

      await page.goto(nowPostPath(id))

      // 英語版があっても、日本語のときは今までどおり日本語を出す (lib/now/localize.ts)
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible()
    },
  )

  test(
    "英語版を DELETE したあとは、英語の Cookie でも日本語の題名と日本語のみの断り書きになる",
    { tag: "@content", annotation: routes("/now/[id]") },
    async ({ page, request, baseURL }) => {
      if (!baseURL) throw new Error("baseURL が設定されていない")
      const title = uniqueTitle("英語版を外す記事")
      const englishTitle = `${title} (EN)`
      const { id } = await createNowPost(request, { title, body: "日本語の本文です。" })
      await putNowPostEnglish(request, id, { title: englishTitle, body: "English body." })

      const res = await request.delete(`/api/now/${id}/en`, { headers: { Authorization: `Bearer ${nowPostToken}` } })
      expect(res.status()).toBe(204)

      await page.context().addCookies([{ name: localeCookieName, value: "en", url: baseURL }])
      await page.goto(nowPostPath(id))

      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible()
      await expect(page.getByText(en.now.japaneseOnlyNote)).toBeVisible()
    },
  )
})
