import { careerDataEn } from "../data/en/career"
import { pageGuidesEn, profileEn } from "../data/en/overview"
import { certificationsEn } from "../data/en/skills"
import { worksEn } from "../data/en/works"
import { en } from "../data/messages/en"
import { ja } from "../data/messages/ja"
import { localeCookieName } from "../lib/i18n/config"
import { navItems } from "../lib/navigation"
import { expect, pages, routes, test } from "./fixtures"

// 右上の言語スイッチ (PBI-0014)。選んだ言語は Cookie に残り、全ページの文言とデータが切り替わる
// 期待値は data/messages/ と data/en/ から読み、文言を二重に書かない

test.describe("表示言語", () => {
  test(
    "既定は日本語で、右上のスイッチは JP が選ばれている。準備中のお知らせは出ない",
    { tag: ["@smoke", "@responsive"], annotation: routes("/", "/overview") },
    async ({ page }) => {
      await page.goto("/")
      await expect(page.locator("html")).toHaveAttribute("lang", "ja")
      await expect(page.getByText("準備中")).toHaveCount(0)

      await page.goto("/overview")
      await expect(page.getByText("準備中")).toHaveCount(0)
      const group = page.getByRole("group", { name: ja.layout.language })
      await expect(group.getByRole("button", { name: "JP" })).toHaveAttribute("aria-pressed", "true")
      await expect(group.getByRole("button", { name: "EN" })).toHaveAttribute("aria-pressed", "false")
    },
  )

  test("スイッチは画面の右上にある", { tag: ["@navigation", "@responsive"], annotation: routes("/overview") }, async ({ page }) => {
    await page.goto("/overview")
    const box = await page.getByRole("group", { name: ja.layout.language }).boundingBox()
    const viewport = page.viewportSize()
    if (!box || !viewport) throw new Error("スイッチの位置か画面の大きさが取れない")
    // 右端から 32px 以内、上から 2 段目の帯 (タブとアドレスバー) の中
    expect(viewport.width - (box.x + box.width)).toBeLessThan(32)
    expect(box.y).toBeLessThan(100)
  })

  test(
    "EN を押すと英語に切り替わり、他のページに移っても再読み込みしても英語のまま。JP で戻せる",
    { tag: ["@interaction", "@navigation", "@responsive"], annotation: routes("/overview", "/career") },
    async ({ page }) => {
      await page.goto("/overview")
      await page.getByRole("group", { name: ja.layout.language }).getByRole("button", { name: "EN" }).click()

      await expect(page.getByRole("heading", { level: 1, name: en.nav.overview })).toBeVisible()
      await expect(page.locator("html")).toHaveAttribute("lang", "en")
      const tabs = page.getByRole("navigation", { name: en.layout.pages }).getByRole("link")
      await expect(tabs).toHaveText(navItems.map((item) => en.nav[item.id]))

      await tabs.filter({ hasText: en.nav.career }).click()
      await expect(page.getByRole("heading", { level: 1, name: en.nav.career })).toBeVisible()
      await page.reload()
      await expect(page.getByRole("heading", { level: 1, name: en.nav.career })).toBeVisible()

      await page.getByRole("group", { name: en.layout.language }).getByRole("button", { name: "JP" }).click()
      await expect(page.getByRole("heading", { level: 1, name: ja.nav.career })).toBeVisible()
      await expect(page.locator("html")).toHaveAttribute("lang", "ja")
    },
  )

  test(
    "英語に切り替えたあと、別のタブを押すと英語の中身が出る",
    { tag: ["@interaction", "@navigation"], annotation: routes("/overview", "/career") },
    async ({ page }) => {
      await page.goto("/overview")
      await page.getByRole("group", { name: ja.layout.language }).getByRole("button", { name: "EN" }).click()
      await expect(page.getByRole("heading", { level: 1, name: en.nav.overview })).toBeVisible()

      // 言語を切り替えると枠は英語で描き直される。そのあとの移動でも、言語に依らない殻に引きずられず英語の中身が出る
      const tabs = page.getByRole("navigation", { name: en.layout.pages })
      await tabs.getByRole("link", { name: en.nav.career, exact: true }).click()
      await expect(page.getByRole("heading", { level: 1, name: en.nav.career })).toBeVisible()
    },
  )
})

test.describe("html の lang (直接開いたとき)", () => {
  // <head> のインラインのスクリプトが Cookie を読む経路を、クライアントの操作を挟まずに確かめる (PBI-009)
  test(
    '英語の Cookie で直接開くと <html lang="en"> になる',
    { tag: ["@content"], annotation: routes("/overview") },
    async ({ page, baseURL }) => {
      if (!baseURL) throw new Error("baseURL が設定されていない")
      await page.context().addCookies([{ name: localeCookieName, value: "en", url: baseURL }])
      await page.goto("/overview")
      await expect(page.locator("html")).toHaveAttribute("lang", "en")
    },
  )

  test(
    '日本語の Cookie で直接開くと <html lang="ja"> になる',
    { tag: ["@content"], annotation: routes("/overview") },
    async ({ page, baseURL }) => {
      if (!baseURL) throw new Error("baseURL が設定されていない")
      await page.context().addCookies([{ name: localeCookieName, value: "ja", url: baseURL }])
      await page.goto("/overview")
      await expect(page.locator("html")).toHaveAttribute("lang", "ja")
    },
  )
})

test(
  "トップ: 英語の Cookie で開くと、言語のスイッチの EN が選ばれ、導入演出の領域の名前が英語",
  { tag: ["@content", "@interaction"], annotation: routes("/") },
  async ({ page, baseURL }) => {
    if (!baseURL) throw new Error("baseURL が設定されていない")
    await page.context().addCookies([{ name: localeCookieName, value: "en", url: baseURL }])
    await page.goto("/")

    await expect(page.getByRole("group", { name: en.layout.language }).getByRole("button", { name: "EN" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    // 領域の名前は殻ではなく言語の島が描き、aria-labelledby で渡す。島が流れてくるまで待つ
    await expect(page.getByRole("region", { name: en.intro.loading })).toBeVisible()
  },
)

test(
  "トップ: 右上のスイッチで英語にすると、Enter の先も英語で出る",
  { tag: ["@interaction", "@responsive"], annotation: routes("/", "/overview") },
  async ({ page }) => {
    await page.goto("/")
    const group = page.getByRole("group", { name: ja.layout.language })
    const box = await group.boundingBox()
    const viewport = page.viewportSize()
    if (!box || !viewport) throw new Error("スイッチの位置か画面の大きさが取れない")
    expect(viewport.width - (box.x + box.width)).toBeLessThan(32)
    expect(box.y).toBeLessThan(100)

    await group.getByRole("button", { name: "EN" }).click()
    await expect(page.getByRole("group", { name: en.layout.language }).getByRole("button", { name: "EN" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await page.getByRole("link", { name: "Enter" }).click()
    await expect(page.getByRole("heading", { level: 1, name: en.nav.overview })).toBeVisible()
  },
)

test.describe("表示言語 (英語の内容)", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    if (!baseURL) throw new Error("baseURL が設定されていない")
    await page.context().addCookies([{ name: localeCookieName, value: "en", url: baseURL }])
  })

  for (const p of pages) {
    test(`${p.path} の見出しとタブが英語になる`, { tag: "@content", annotation: routes(p.path) }, async ({ page }) => {
      await page.goto(p.path)
      const item = navItems.find((nav) => nav.href === p.path)
      if (!item) throw new Error(`${p.path} が lib/navigation.ts にない`)
      await expect(page.getByRole("heading", { level: 1, name: en.nav[item.id] })).toBeVisible()
      await expect(
        page.getByRole("navigation", { name: en.layout.pages }).getByRole("link", { name: en.nav[item.id], exact: true }),
      ).toHaveAttribute("aria-current", "page")
    })
  }

  test("概要: 自己紹介と各ページの案内が英語で出る", { tag: "@content", annotation: routes("/overview") }, async ({ page }) => {
    await page.goto("/overview")
    await expect(page.getByText(profileEn.role, { exact: true })).toBeVisible()
    for (const paragraph of profileEn.summary) {
      await expect(page.getByText(paragraph)).toBeVisible()
    }
    const list = page.getByRole("list", { name: en.overview.guideList })
    for (const guide of pageGuidesEn) {
      await expect(list.getByText(guide.description)).toBeVisible()
    }
  })

  test("経歴: 英語の経歴が期間付きで並ぶ", { tag: "@content", annotation: routes("/career") }, async ({ page }) => {
    await page.goto("/career")
    await expect(page.getByRole("main").getByRole("heading", { level: 2 })).toHaveText(careerDataEn.map((e) => e.title))
    for (const entry of careerDataEn) {
      await expect(page.getByText(`${entry.startDate} - ${entry.endDate ?? en.career.present}`)).toBeVisible()
    }
  })

  test("スキル: 資格ハイライトが英語で出る", { tag: "@content", annotation: routes("/skills") }, async ({ page }) => {
    await page.goto("/skills")
    await expect(page.getByRole("heading", { name: en.skills.certifications })).toBeVisible()
    for (const cert of certificationsEn) {
      await expect(page.getByRole("listitem").filter({ hasText: cert })).toBeVisible()
    }
  })

  test("ワーク: 作品のカードが英語で出る", { tag: "@content", annotation: routes("/works") }, async ({ page }) => {
    await page.goto("/works")
    for (const work of worksEn) {
      await expect(page.getByRole("heading", { level: 2, name: work.title })).toBeVisible()
      await expect(page.getByText(work.description)).toBeVisible()
    }
  })

  test("チャット: 挨拶と質問の候補が英語で出る", { tag: "@content", annotation: routes("/chat") }, async ({ page }) => {
    await page.goto("/chat")
    const log = page.getByRole("log", { name: en.chat.log })
    await expect(log.getByText(en.chat.greeting)).toBeVisible()
    for (const suggestion of en.chat.suggestions) {
      await expect(log.getByRole("button", { name: suggestion })).toBeVisible()
    }
  })

  test("テーマ: 背景テーマの名前が英語で出る", { tag: "@content", annotation: routes("/theme") }, async ({ page }) => {
    await page.goto("/theme")
    const group = page.getByRole("group", { name: en.theme.legend })
    for (const theme of Object.values(en.theme.themes)) {
      await expect(group.getByRole("radio", { name: theme.label })).toBeAttached()
    }
  })
})
