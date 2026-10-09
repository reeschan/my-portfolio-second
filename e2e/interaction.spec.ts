import { expect, routes, test } from "./fixtures"

test.describe("ページ内の操作", () => {
  test(
    "経歴: 参画案件の詳細ダイアログを開いて閉じられる",
    { tag: ["@interaction", "@responsive"], annotation: routes("/career") },
    async ({ page }) => {
      await page.goto("/career")
      await page.getByRole("button", { name: "参画案件の詳細" }).first().click()

      const dialog = page.getByRole("dialog")
      await expect(dialog).toBeVisible()
      await expect(dialog.getByRole("heading", { name: "参画案件の詳細" })).toBeVisible()

      await page.keyboard.press("Escape")
      await expect(dialog).toBeHidden()
    },
  )

  test("経歴: 継続中の経歴に「継続中」バッジが出る", { tag: "@interaction", annotation: routes("/career") }, async ({ page }) => {
    await page.goto("/career")
    await expect(page.getByText("継続中", { exact: true }).first()).toBeVisible()
  })

  test("スキル: カテゴリのタブを切り替えられる", { tag: "@interaction", annotation: routes("/skills") }, async ({ page }) => {
    await page.goto("/skills")
    await expect(page.getByText("資格ハイライト")).toBeVisible()

    await page.getByRole("tab", { name: "AWS" }).click()
    await expect(page.getByRole("tab", { name: "AWS" })).toHaveAttribute("aria-selected", "true")
    await expect(page.getByText("AWSスキル (5段階評価)")).toBeVisible()
    await expect(page.getByText("資格ハイライト")).toBeHidden()
  })

  test(
    "ワーク: ポートフォリオのカードから詳細ダイアログが開く",
    { tag: "@interaction", annotation: routes("/works") },
    async ({ page }) => {
      await page.goto("/works")
      await page.getByRole("heading", { name: "ポートフォリオサイト" }).click()

      const dialog = page.getByRole("dialog", { name: "ポートフォリオサイト" })
      await expect(dialog).toBeVisible()
      await page.keyboard.press("Escape")
      await expect(dialog).toBeHidden()
    },
  )
})

test.describe("ページ内の操作 (追加分)", () => {
  test(
    "経歴: ダイアログに参画先ごとの概要が出て、閉じるボタンでも閉じられる",
    { tag: "@interaction", annotation: routes("/career") },
    async ({ page }) => {
      await page.goto("/career")
      await page.getByRole("button", { name: "参画案件の詳細" }).first().click()

      const dialog = page.getByRole("dialog", { name: "参画案件の詳細" })
      await expect(dialog.getByRole("heading", { level: 3, name: "Forgers" })).toBeVisible()
      await expect(dialog.getByRole("heading", { level: 3, name: "Stract" })).toBeVisible()

      await dialog.getByRole("button", { name: "閉じる" }).click()
      await expect(dialog).toBeHidden()
      // 閉じたあとはフォーカスが開いたボタンに戻る (キーボード操作の続きができる)
      await expect(page.getByRole("button", { name: "参画案件の詳細" }).first()).toBeFocused()
    },
  )

  test("スキル: すべてのカテゴリのタブを順に切り替えられる", { tag: "@interaction", annotation: routes("/skills") }, async ({ page }) => {
    await page.goto("/skills")
    for (const [tab, title] of [
      ["フロントエンド", "フロントエンドスキル (5段階評価)"],
      ["バックエンド", "バックエンドスキル (5段階評価)"],
      ["AWS", "AWSスキル (5段階評価)"],
      ["概要", "スキルレーダー (5段階評価)"],
    ]) {
      await page.getByRole("tab", { name: tab }).click()
      await expect(page.getByRole("tab", { name: tab })).toHaveAttribute("aria-selected", "true")
      await expect(page.getByRole("heading", { name: title })).toBeVisible()
    }
  })

  test("スキル: タブは矢印キーでも切り替えられる", { tag: "@interaction", annotation: routes("/skills") }, async ({ page }) => {
    await page.goto("/skills")
    await page.getByRole("tab", { name: "概要" }).focus()
    await page.keyboard.press("ArrowRight")
    await expect(page.getByRole("tab", { name: "フロントエンド" })).toBeFocused()
    await expect(page.getByRole("tab", { name: "フロントエンド" })).toHaveAttribute("aria-selected", "true")
  })

  test(
    "ワーク: 作品の詳細ダイアログにアーキテクチャ図が出て、閉じるボタンで閉じられる",
    { tag: ["@interaction", "@responsive"], annotation: routes("/works") },
    async ({ page }) => {
      await page.goto("/works")
      await page.getByRole("button", { name: "ポートフォリオサイト" }).click()

      const dialog = page.getByRole("dialog", { name: "ポートフォリオサイト" })
      await expect(dialog.getByRole("heading", { name: "アーキテクチャ", exact: true })).toBeVisible()
      await expect(dialog.getByRole("listitem")).toHaveCount(4)

      await dialog.getByRole("button", { name: "閉じる" }).click()
      await expect(dialog).toBeHidden()
    },
  )

  test("ワーク: 詳細のない作品は押せない (ボタンにならない)", { tag: "@interaction", annotation: routes("/works") }, async ({ page }) => {
    await page.goto("/works")
    await expect(page.getByRole("heading", { name: "プロジェクト2" })).toBeVisible()
    await expect(page.getByRole("button", { name: "プロジェクト2" })).toHaveCount(0)
  })

  test("ワーク: キーボードだけで詳細ダイアログを開ける", { tag: "@interaction", annotation: routes("/works") }, async ({ page }) => {
    await page.goto("/works")
    await page.getByRole("button", { name: "ポートフォリオサイト" }).focus()
    await page.keyboard.press("Enter")
    await expect(page.getByRole("dialog", { name: "ポートフォリオサイト" })).toBeVisible()
  })

  test(
    "Now: 外部リンクは新しいタブで開き、遷移元の情報を渡さない",
    { tag: "@interaction", annotation: routes("/now") },
    async ({ page }) => {
      await page.goto("/now")
      const link = page.getByRole("link", { name: "nownownow.com/about" })
      await expect(link).toHaveAttribute("href", "https://nownownow.com/about")
      await expect(link).toHaveAttribute("target", "_blank")
      await expect(link).toHaveAttribute("rel", /noopener/)
      await expect(link).toHaveAttribute("rel", /noreferrer/)
    },
  )

  test("トップ: お知らせバナーを閉じられる", { tag: "@interaction", annotation: routes("/") }, async ({ page }) => {
    await page.goto("/")
    const banner = page.getByRole("region", { name: "お知らせ" })
    await expect(banner).toBeVisible()
    await banner.getByRole("button", { name: "お知らせを閉じる" }).click()
    await expect(banner).toBeHidden()
  })
})

test(
  "スキル: スマホ幅ではタブ名が短縮表示になる",
  { tag: ["@interaction", "@responsive"], annotation: routes("/skills") },
  async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 740 })
    await page.goto("/skills")
    await expect(page.getByRole("tab", { name: "FE", exact: true })).toBeVisible()
    await expect(page.getByRole("tab", { name: "BE", exact: true })).toBeVisible()
    await page.getByRole("tab", { name: "FE", exact: true }).click()
    await expect(page.getByRole("heading", { name: "フロントエンド", exact: true })).toBeVisible()
  },
)
