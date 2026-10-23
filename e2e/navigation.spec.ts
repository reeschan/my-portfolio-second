import { ja } from "../data/messages/ja"
import { expect, pages, routes, test } from "./fixtures"

test.describe("ナビゲーション", () => {
  test(
    "トップの Enter から概要ページへ進める",
    { tag: ["@navigation", "@responsive"], annotation: routes("/", "/overview") },
    async ({ page }) => {
      await page.goto("/")
      await page.getByRole("link", { name: "Enter" }).click()
      await expect(page).toHaveURL(/\/overview$/)
      await expect(page.getByRole("heading", { level: 1, name: "概要" })).toBeVisible()
    },
  )

  test(
    "タブを順にクリックして全ページを巡回できる",
    { tag: ["@navigation", "@responsive"], annotation: routes(...pages.map((p) => p.path)) },
    async ({ page }) => {
      await page.goto("/overview")
      // 概要の本文にも各ページへのリンクがあるので、タブの帯に絞って押す
      const nav = page.getByRole("navigation", { name: "ページ切り替え" })
      for (const p of pages) {
        await nav.getByRole("link", { name: p.tab, exact: true }).click()
        await expect(page).toHaveURL(new RegExp(`${p.path}$`))
        await expect(page.getByRole("heading", { level: 1, name: p.heading })).toBeVisible()
      }
    },
  )

  test(
    "タブの並び順が 概要→経歴→スキル→ワーク→Now→チャット→テーマ になっている",
    { tag: "@navigation", annotation: routes("/overview") },
    async ({ page }) => {
      await page.goto("/overview")
      const names = pages.map((p) => p.tab)
      const tabLinks = page
        .getByRole("navigation", { name: "ページ切り替え" })
        .getByRole("link")
        .filter({ hasText: new RegExp(`^(${names.join("|")})$`) })
      await expect(tabLinks).toHaveText(names)
    },
  )

  test("RSS ボタンがフィードを指している", { tag: "@navigation", annotation: routes("/overview") }, async ({ page }) => {
    await page.goto("/overview")
    await expect(page.getByRole("link", { name: "RSSフィード" })).toHaveAttribute("href", "/rss.xml")
  })

  test("タブを押してもタブバーが描き直されない", { tag: "@navigation", annotation: routes("/overview", "/career") }, async ({ page }) => {
    await page.goto("/overview")
    const nav = page.getByRole("navigation", { name: ja.layout.pages })
    // 押す前のタブバーの要素を取っておく
    const handle = await nav.elementHandle()
    if (!handle) throw new Error("タブバーが見つからない")

    await nav.getByRole("link", { name: ja.nav.career, exact: true }).click()
    await expect(page.getByRole("heading", { level: 1, name: ja.nav.career })).toBeVisible()

    // Cache Components は移動したページを unmount せず <Activity> で display: none のまま残す。
    // そのため「DOM に残っているか」(isConnected) だけでは、ページごとにタブバーを描いていた
    // 構成でも古い要素が隠れて残って true になり、描き直しを見分けられない。
    // 移動後に「いま見えている」タブバーを取り直し (getByRole は display: none の要素を拾わない)、
    // 押す前に取っておいた要素と同じノードかどうかで、描き直されていないことを確かめる
    const after = await nav.elementHandle()
    if (!after) throw new Error("移動後のタブバーが見つからない")
    expect(await handle.evaluate((el, current) => el === current, after)).toBe(true)
    // 念のため、取っておいた要素が隠れず見えたままであることも確かめる
    expect(await handle.evaluate((el) => el.checkVisibility())).toBe(true)
  })
})

test.describe("ナビゲーション (現在地)", () => {
  for (const p of pages) {
    test(
      `${p.path} では「${p.tab}」タブだけが現在のページとして示される`,
      { tag: "@navigation", annotation: routes(p.path) },
      async ({ page }) => {
        await page.goto(p.path)
        const nav = page.getByRole("navigation", { name: "ページ切り替え" })
        await expect(nav.getByRole("link", { name: p.tab, exact: true })).toHaveAttribute("aria-current", "page")
        await expect(nav.locator("[aria-current]")).toHaveCount(1)
      },
    )
  }

  test(
    "スマホ幅でもタブバーを横にスクロールして最後のタブまで押せる",
    { tag: ["@navigation", "@responsive"], annotation: routes("/overview", "/chat") },
    async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 740 })
      await page.goto("/overview")
      const last = page.getByRole("navigation", { name: "ページ切り替え" }).getByRole("link", { name: "チャット", exact: true })
      await last.scrollIntoViewIfNeeded()
      await last.click()
      await expect(page).toHaveURL(/\/chat$/)
    },
  )
})
