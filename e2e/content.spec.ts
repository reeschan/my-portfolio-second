import { expect, routes, test } from "./fixtures"
import { careerData } from "../data/career"
import { pageGuides, profile, profileLinks } from "../data/overview"
import { certifications } from "../data/skills"
import { works } from "../data/works"

// testing/e2e-policy.yml の content 観点。data/ に書いた内容が、漏れなく画面に出ることを確かめる
// (文言そのものは data/ が正本なので、テストは data/ から読んで突き合わせる)

test.describe("表示内容", () => {
  test("概要: プロフィールの見出しと肩書き・自己紹介が出る", { tag: "@content", annotation: routes("/overview") }, async ({ page }) => {
    await page.goto("/overview")
    await expect(page.getByRole("heading", { level: 2, name: "プロフィール" })).toBeVisible()
    await expect(page.getByText(profile.role, { exact: true })).toBeVisible()
    // メインのアイコンが代替テキスト付きで、読み込めている (壊れた画像でない)
    const avatar = page.getByRole("img", { name: profile.avatar.alt })
    await expect(avatar).toBeVisible()
    await expect.poll(() => avatar.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
    for (const paragraph of profile.summary) {
      await expect(page.getByText(paragraph)).toBeVisible()
    }
  })

  test("概要: 外部のプロフィールへのリンクが新しいタブで開く", { tag: "@content", annotation: routes("/overview") }, async ({ page }) => {
    await page.goto("/overview")
    const list = page.getByRole("list", { name: "外部のプロフィール" })
    for (const link of profileLinks) {
      const anchor = list.getByRole("link", { name: link.label, exact: true })
      await expect(anchor).toHaveAttribute("href", link.href)
      await expect(anchor).toHaveAttribute("target", "_blank")
      await expect(anchor).toHaveAttribute("rel", "noopener noreferrer")
    }
  })

  test(
    "概要: 各ページの案内がタブと同じ順に並び、押すとそのページへ進める",
    { tag: ["@content", "@navigation"], annotation: routes("/overview", "/career") },
    async ({ page }) => {
      await page.goto("/overview")
      const list = page.getByRole("list", { name: "各ページの案内" })
      await expect(list.getByRole("listitem")).toHaveCount(pageGuides.length)
      for (const guide of pageGuides) {
        await expect(list.getByText(guide.description)).toBeVisible()
      }
      await list.getByRole("link", { name: "経歴", exact: true }).click()
      await expect(page).toHaveURL(/\/career$/)
      await expect(page.getByRole("heading", { level: 1, name: "経歴" })).toBeVisible()
    },
  )

  test(
    "経歴: すべての経歴が新しい順に、期間付きで並ぶ",
    { tag: ["@content", "@responsive"], annotation: routes("/career") },
    async ({ page }) => {
      await page.goto("/career")
      const headings = page.getByRole("main").getByRole("heading", { level: 3 })
      await expect(headings).toHaveText(careerData.map((e) => e.title))
      for (const entry of careerData) {
        await expect(page.getByText(`${entry.startDate} - ${entry.endDate ?? "現在"}`)).toBeVisible()
      }
    },
  )

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

  test(
    "ワーク: すべての作品がカードで並び、画像に代替テキストがある",
    { tag: ["@content", "@responsive"], annotation: routes("/works") },
    async ({ page }) => {
      await page.goto("/works")
      for (const work of works) {
        const card = page.getByRole("article").filter({ has: page.getByRole("heading", { name: work.title }) })
        await expect(card).toBeVisible()
        await expect(card.getByRole("img", { name: work.architecture.alt })).toBeVisible()
      }
      // 仮置きだった作品は無くなっている
      await expect(page.getByRole("heading", { name: "プロジェクト2" })).toHaveCount(0)
    },
  )

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
