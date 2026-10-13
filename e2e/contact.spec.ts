import type { Page } from "@playwright/test"
import { en } from "../data/messages/en"
import { ja } from "../data/messages/ja"
import { localeCookieName } from "../lib/i18n/config"
import { expect, routes, test } from "./fixtures"

// お問い合わせのページ (PBI-0018、ADR 0028)。期待する文言は data/messages/ から読み、二重に書かない
// /api/contact はブラウザ側でモックする。本物の Slack は呼ばない (testing/e2e-policy.yml の external-mock 観点)

const t = ja.contact

// 送り主の入力の例。アドレスは予約済みの .test ドメインにして、実在の宛先を書かない
const sample = {
  name: "山田 太郎",
  email: "sender@example.test",
  message: "お仕事のご相談です。来月からの案件についてお話しできますか。",
}

async function mockContactApi(page: Page, reply: { status: number; body: unknown }) {
  const sent: unknown[] = []
  await page.route("**/api/contact", async (route) => {
    sent.push(route.request().postDataJSON())
    await route.fulfill({ status: reply.status, contentType: "application/json", body: JSON.stringify(reply.body) })
  })
  return sent
}

function fields(page: Page, labels: { name: string; email: string; message: string } = t) {
  return {
    name: page.getByRole("textbox", { name: labels.name, exact: true }),
    email: page.getByRole("textbox", { name: labels.email, exact: true }),
    message: page.getByRole("textbox", { name: labels.message, exact: true }),
  }
}

async function fillSample(page: Page) {
  const f = fields(page)
  await f.name.fill(sample.name)
  await f.email.fill(sample.email)
  await f.message.fill(sample.message)
}

test.describe("お問い合わせ", () => {
  test(
    "名前・メールアドレス・本文を書いて送ると受付の案内が出て、別のお問い合わせを送るで空のフォームに戻る",
    { tag: ["@interaction", "@external-mock", "@responsive"], annotation: routes("/contact") },
    async ({ page }) => {
      const sent = await mockContactApi(page, { status: 200, body: { received: true } })
      await page.goto("/contact")

      await fillSample(page)
      await page.getByRole("button", { name: t.submit }).click()

      await expect(page.getByRole("heading", { name: t.receivedTitle })).toBeVisible()
      await expect(page.getByText(t.receivedBody)).toBeVisible()
      // 3 項目が届き、人が触らないハニーポットは空のまま送られる
      expect(sent).toEqual([{ ...sample, website: "" }])

      await page.getByRole("button", { name: t.again }).click()
      const f = fields(page)
      await expect(f.name).toHaveValue("")
      await expect(f.email).toHaveValue("")
      await expect(f.message).toHaveValue("")
      await expect(page.getByRole("heading", { name: t.receivedTitle })).toBeHidden()
    },
  )

  test.describe("API が失敗したとき", () => {
    // 502 / 429 を返させるので、ブラウザが出すリソース読み込みエラーは想定内
    // 要素が 2 つの配列は Playwright が [値, オプション] と読み違えるので、1 つの正規表現にまとめる
    test.use({ allowedConsoleErrors: [/status of (502|429)/] })

    const cases = [
      { status: 502, expected: t.errors.failed },
      { status: 429, expected: t.errors.tooMany },
    ] as const

    for (const c of cases) {
      test(
        `API が失敗するとエラーが出て、入力が残っている (${c.status})`,
        { tag: ["@interaction", "@external-mock"], annotation: routes("/contact") },
        async ({ page }) => {
          // API の文言 (日本語だけ) ではなく、ステータスに応じた辞書の文言が出ることを確かめるため、別の文言を返させる
          await mockContactApi(page, { status: c.status, body: { error: "API の文言" } })
          await page.goto("/contact")

          await fillSample(page)
          await page.getByRole("button", { name: t.submit }).click()

          // Next.js のルートアナウンサーも role="alert" を持つので、文言で絞る
          await expect(page.getByRole("alert").filter({ hasText: c.expected })).toHaveText(c.expected)
          await expect(page.getByText("API の文言")).toHaveCount(0)
          const f = fields(page)
          await expect(f.name).toHaveValue(sample.name)
          await expect(f.email).toHaveValue(sample.email)
          await expect(f.message).toHaveValue(sample.message)
          await expect(page.getByRole("button", { name: t.submit })).toBeEnabled()
        },
      )
    }
  })

  test(
    "空欄やメールアドレスの形の誤りでは送られず、どこが悪いかが出る",
    { tag: "@interaction", annotation: routes("/contact") },
    async ({ page }) => {
      const sent = await mockContactApi(page, { status: 200, body: { received: true } })
      await page.goto("/contact")
      const f = fields(page)

      await page.getByRole("button", { name: t.submit }).click()
      await expect(page.getByText(t.nameRequired)).toBeVisible()
      await expect(page.getByText(t.emailInvalid)).toBeVisible()
      await expect(page.getByText(t.messageLength)).toBeVisible()
      await expect(f.name).toHaveAttribute("aria-invalid", "true")
      // エラーの文言が入力欄の説明として読み上げられる
      await expect(f.name).toHaveAccessibleDescription(t.nameRequired)

      await f.name.fill(sample.name)
      await f.email.fill("not-an-address")
      await f.message.fill(sample.message)
      await page.getByRole("button", { name: t.submit }).click()
      await expect(page.getByText(t.emailInvalid)).toBeVisible()
      await expect(f.email).toHaveAttribute("aria-invalid", "true")
      await expect(page.getByText(t.nameRequired)).toHaveCount(0)
      await expect(f.name).not.toHaveAttribute("aria-invalid", "true")

      expect(sent).toHaveLength(0)
    },
  )

  test("キーボードだけで入力して送れる", { tag: ["@interaction", "@external-mock"], annotation: routes("/contact") }, async ({ page }) => {
    const sent = await mockContactApi(page, { status: 200, body: { received: true } })
    await page.goto("/contact")
    const f = fields(page)

    await f.name.focus()
    await page.keyboard.type(sample.name)
    await page.keyboard.press("Tab")
    await expect(f.email).toBeFocused()
    await page.keyboard.type(sample.email)
    await page.keyboard.press("Tab")
    await expect(f.message).toBeFocused()
    await page.keyboard.type(sample.message)
    // 本文の次は送信ボタン。ハニーポットにはフォーカスが入らない
    await page.keyboard.press("Tab")
    await expect(page.getByRole("button", { name: t.submit })).toBeFocused()
    await page.keyboard.press("Enter")

    await expect(page.getByRole("heading", { name: t.receivedTitle })).toBeVisible()
    expect(sent).toEqual([{ ...sample, website: "" }])
  })

  test("ページに持ち主のメールアドレスを載せていない", { tag: "@content", annotation: routes("/contact") }, async ({ page }) => {
    await page.goto("/contact")
    await expect(page.getByRole("heading", { level: 1, name: ja.nav.contact })).toBeVisible()

    await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0)
    const address = /[\w.+-]+@[\w-]+\.[\w.]+/
    expect(await page.locator("body").innerText()).not.toMatch(address)
    const placeholders = await page.locator("input, textarea").evaluateAll((els) => els.map((el) => el.getAttribute("placeholder") ?? ""))
    for (const p of placeholders) expect(p).not.toMatch(address)
  })
})

test.describe("お問い合わせ (英語)", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    if (!baseURL) throw new Error("baseURL が設定されていない")
    await page.context().addCookies([{ name: localeCookieName, value: "en", url: baseURL }])
  })

  test("英語に切り替えると、見出し・項目名・ボタンが英語になる", { tag: "@content", annotation: routes("/contact") }, async ({ page }) => {
    await page.goto("/contact")

    await expect(page.getByRole("heading", { level: 1, name: en.nav.contact })).toBeVisible()
    const f = fields(page, en.contact)
    await expect(f.name).toBeVisible()
    await expect(f.email).toBeVisible()
    await expect(f.message).toBeVisible()
    await expect(page.getByRole("button", { name: en.contact.submit })).toBeVisible()
    await expect(page.getByText(en.contact.privacy)).toBeVisible()
  })
})
