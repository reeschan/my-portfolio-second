import type { Page } from "@playwright/test"
import { expect, routes, test } from "./fixtures"

// /api/chat はブラウザ側でモックする。本物の LLM は呼ばない (testing/e2e-policy.yml の external-mock 観点)
async function mockChatApi(page: Page, reply: { status?: number; body: string; json?: boolean }) {
  const sent: unknown[] = []
  await page.route("**/api/chat", async (route) => {
    sent.push(route.request().postDataJSON())
    await route.fulfill({
      status: reply.status ?? 200,
      contentType: reply.json ? "application/json" : "text/plain; charset=utf-8",
      body: reply.body,
    })
  })
  return sent
}

test.describe("チャット", () => {
  test("質問を送ると回答が表示され、送信した履歴が API に渡る", { tag: ["@chat", "@external-mock", "@responsive"], annotation: routes("/chat") }, async ({ page }) => {
    const sent = await mockChatApi(page, { body: "React と AWS を中心に開発しています。" })
    await page.goto("/chat")

    await page.getByRole("textbox", { name: "質問" }).fill("得意な技術は？")
    await page.getByRole("button", { name: "送信" }).click()

    await expect(page.getByText("React と AWS を中心に開発しています。")).toBeVisible()
    await expect(page.getByText("得意な技術は？")).toBeVisible()
    expect(sent).toEqual([{ messages: [{ role: "user", content: "得意な技術は？" }] }])
    await expect(page.getByRole("textbox", { name: "質問" })).toHaveValue("")
  })

  test("候補の質問ボタンから送信でき、送信後は候補が消える", { tag: ["@chat", "@external-mock"], annotation: routes("/chat") }, async ({ page }) => {
    await mockChatApi(page, { body: "経歴の回答です。" })
    await page.goto("/chat")

    const suggestion = page.getByRole("button", { name: "これまでの経歴を簡単に教えてください" })
    await suggestion.click()

    await expect(page.getByText("経歴の回答です。")).toBeVisible()
    await expect(suggestion).toBeHidden()
  })

  test.describe("API エラー時", () => {
    // 503 を返させるので、ブラウザが出すリソース読み込みエラーは想定内
    test.use({ allowedConsoleErrors: [/status of 503/] })

    test("API がエラーを返したらメッセージを出し、質問を入力欄に戻す", { tag: ["@chat", "@external-mock"], annotation: routes("/chat") }, async ({ page }) => {
      await mockChatApi(page, {
        status: 503,
        json: true,
        body: JSON.stringify({ error: "チャット機能は現在ご利用いただけません。" }),
      })
      await page.goto("/chat")

      await page.getByRole("textbox", { name: "質問" }).fill("AWS の経験は？")
      await page.getByRole("button", { name: "送信" }).click()

      await expect(page.getByText("チャット機能は現在ご利用いただけません。")).toBeVisible()
      await expect(page.getByRole("textbox", { name: "質問" })).toHaveValue("AWS の経験は？")
    })
  })

  test("空欄では送信ボタンが押せず、入力は 1000 字までに制限される", { tag: "@chat", annotation: routes("/chat") }, async ({ page }) => {
    await page.goto("/chat")
    await expect(page.getByRole("button", { name: "送信" })).toBeDisabled()
    await expect(page.getByRole("textbox", { name: "質問" })).toHaveAttribute("maxlength", "1000")
  })
})
