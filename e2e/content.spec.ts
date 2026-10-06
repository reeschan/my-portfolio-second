import { expect, routes, test } from "./fixtures"
import { careerData } from "../data/career"
import { certifications } from "../data/skills"
import { works } from "../data/works"
import { now } from "../data/now"

// testing/e2e-policy.yml の content 観点。data/ に書いた内容が、漏れなく画面に出ることを確かめる
// (文言そのものは data/ が正本なので、テストは data/ から読んで突き合わせる)

test.describe("表示内容", () => {
  test("概要: プロフィールの見出しが出る", { tag: "@content", annotation: routes("/overview") }, async ({ page }) => {
    await page.goto("/overview")
    await expect(page.getByRole("heading", { level: 2, name: "プロフィール" })).toBeVisible()
  })

  test("経歴: すべての経歴が新しい順に、期間付きで並ぶ", { tag: ["@content", "@responsive"], annotation: routes("/career") }, async ({ page }) => {
    await page.goto("/career")
    const headings = page.getByRole("main").getByRole("heading", { level: 3 })
    await expect(headings).toHaveText(careerData.map((e) => e.title))
    for (const entry of careerData) {
      await expect(page.getByText(`${entry.startDate} - ${entry.endDate ?? "現在"}`)).toBeVisible()
    }
  })

  test("経歴: 参画先の一覧が出る", { tag: "@content", annotation: routes("/career") }, async ({ page }) => {
    await page.goto("/career")
    const clients = careerData.flatMap((e) => e.engagements ?? []).map((e) => e.client)
    await expect(page.getByRole("list", { name: "参画先" }).getByRole("listitem")).toHaveText(clients)
  })

  test("スキル: 資格ハイライトがすべて出る", { tag: "@content", annotation: routes("/skills") }, async ({ page }) => {
    await page.goto("/skills")
    await expect(page.getByRole("heading", { name: "資格ハイライト" })).toBeVisible()
    for (const cert of certifications) {
      await expect(page.getByRole("listitem").filter({ hasText: cert })).toBeVisible()
    }
  })

  test("スキル: レーダーチャートが描画される", { tag: ["@content", "@responsive"], annotation: routes("/skills") }, async ({ page }) => {
    await page.goto("/skills")
    await expect(page.getByText("スキルレベル (5段階評価)")).toBeVisible()
  })

  test("ワーク: すべての作品がカードで並び、画像に代替テキストがある", { tag: ["@content", "@responsive"], annotation: routes("/works") }, async ({ page }) => {
    await page.goto("/works")
    for (const work of works) {
      const card = page.getByRole("article").filter({ has: page.getByRole("heading", { name: work.title }) })
      await expect(card).toBeVisible()
      await expect(card.getByRole("img", { name: work.image.alt })).toBeVisible()
    }
  })

  test("Now: 更新日が日本語の日付で出る", { tag: "@content", annotation: routes("/now") }, async ({ page }) => {
    await page.goto("/now")
    const [y, m, d] = now.lastUpdated.split("-").map(Number)
    await expect(page.getByText(`${y}年${m}月${d}日`)).toBeVisible()
    for (const section of now.sections) {
      await expect(page.getByRole("heading", { level: 2, name: section.heading })).toBeVisible()
    }
  })

  test("チャット: 最初の挨拶と注意書きが出る", { tag: "@content", annotation: routes("/chat") }, async ({ page }) => {
    await page.goto("/chat")
    await expect(page.getByRole("log", { name: "会話" })).toContainText("職務経歴やスキルについて")
    await expect(page.getByText("詳細については LinkedIn やメール", { exact: false })).toBeVisible()
  })

  test("トップ: 名前と Portfolio の見出しが出る", { tag: "@content", annotation: routes("/") }, async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Ryuki Tobita\s*Portfolio/)
  })
})
