import { expect, pages, routes, test } from "./fixtures"

test.describe("スモーク: 全ページが表示できる", () => {
  test("トップページにタイトルと Enter リンクが出る", { tag: ["@smoke", "@responsive"], annotation: routes("/") }, async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Ryuki Tobita")
    await expect(page.getByRole("link", { name: "Enter" })).toBeVisible()
  })

  for (const p of pages) {
    test(
      `${p.path} が見出し・タブ・アドレスバー付きで表示される`,
      { tag: ["@smoke", "@responsive"], annotation: routes(p.path) },
      async ({ page }) => {
        const res = await page.goto(p.path)
        expect(res?.status()).toBe(200)

        await expect(page.getByRole("heading", { level: 1, name: p.heading })).toBeVisible()
        // 全タブが並んでいる
        for (const q of pages) {
          await expect(page.getByRole("link", { name: q.tab, exact: true })).toBeAttached()
        }
        // アドレスバーに現在のパスが出る
        await expect(page.getByText(`myportfolio.vercel.app${p.path}`)).toBeVisible()
      },
    )
  }

  test("RSS フィードが XML で返る", { tag: ["@smoke", "@api-contract"], annotation: routes("/rss.xml") }, async ({ request }) => {
    const res = await request.get("/rss.xml")
    expect(res.status()).toBe(200)
    expect(res.headers()["content-type"]).toContain("application/xml")
    const body = await res.text()
    expect(body).toContain("<rss")
    expect(body).toContain("<channel>")
  })
})
