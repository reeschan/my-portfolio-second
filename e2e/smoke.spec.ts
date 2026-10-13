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
        // 全タブが並んでいる (概要の本文にも同じ名前のリンクがあるので、タブの帯に絞る)
        const nav = page.getByRole("navigation", { name: "ページ切り替え" })
        for (const q of pages) {
          await expect(nav.getByRole("link", { name: q.tab, exact: true })).toBeAttached()
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

  test(
    "Vercel 以外ではページを移っても計測スクリプトを読み込まない",
    { tag: ["@smoke"], annotation: routes("/overview", "/career") },
    async ({ page }) => {
      // 計測は Vercel 上でだけ行う (ADR 0027)。手元と CI で読むと 404 や外部への通信になる
      const analyticsRequests: string[] = []
      page.on("request", (req) => {
        if (/\/_vercel\/insights\/|va\.vercel-scripts\.com/.test(req.url())) analyticsRequests.push(req.url())
      })

      await page.goto("/overview")
      // タブで移る = 画面が動き出している (計測の部品なら読み込みを始めている) ことを確かめてから数える
      const nav = page.getByRole("navigation", { name: "ページ切り替え" })
      await nav.getByRole("link", { name: "経歴", exact: true }).click()
      await expect(page).toHaveURL(/\/career$/)
      await expect(page.getByRole("heading", { level: 1, name: "経歴" })).toBeVisible()

      expect(analyticsRequests).toEqual([])
      expect(await page.evaluate(() => "va" in window)).toBe(false)
    },
  )
})
