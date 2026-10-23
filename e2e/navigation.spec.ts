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

test.describe("ナビゲーション (先読みが済む前に押したとき)", () => {
  // 先読みの要求をわざと落とすので、その失敗が console に出る
  test.use({ allowedConsoleErrors: [/Failed to load resource: net::ERR_FAILED/] })

  test(
    "先読みが済んでいないタブを押しても、見出しと本文のパネルが消えない",
    { tag: "@navigation", annotation: routes("/overview", "/career", "/skills", "/now", "/theme") },
    async ({ page }) => {
      // 先読みが済む前の状態を作る: 先読みの要求は落とし、押したあとの要求は往復の遅れを足して返す。
      // 遅れが無いと手元では一瞬で替わり、途中で見出しが消えても見逃す
      await page.route("**/*", async (route) => {
        const headers = route.request().headers()
        if (headers["next-router-prefetch"] || headers["next-router-segment-prefetch"]) return route.abort()
        if (headers.rsc) await new Promise((resolve) => setTimeout(resolve, 300))
        return route.continue()
      })
      await page.goto("/overview")
      await expect(page.getByRole("heading", { level: 1, name: ja.nav.overview })).toBeVisible()

      const nav = page.getByRole("navigation", { name: ja.layout.pages })
      // 本文が言語に依るページ (経歴・Now・テーマ) と、クライアントの部品だけのページ (スキル) を混ぜて巡る
      for (const id of ["career", "skills", "now", "theme"] as const) {
        // 押してから替わるまで、毎フレームと DOM の変化ごとに「見えている h1 が無い」「本文のパネルが無い」を数える。
        // 移動前のページは <Activity> で display: none のまま残るので、見えているものだけを数える。
        // 本文がサーバーから後で届くとき (サーバーが重いときなど) は、パネルの中にだけ読み込み中の線が出てよい (ADR 0036)。
        // パネルと読み込み中の線には役割が無いので、ここだけはクラス名と aria-busy で見分ける
        await page.evaluate(() => {
          const state = { frames: 0, noHeading: 0, noPanel: 0, busyNow: false, stopped: false }
          const record = () => {
            const visible = (selector: string) => [...document.querySelectorAll(selector)].some((el) => el.checkVisibility())
            state.frames += 1
            if (!visible("main h1")) state.noHeading += 1
            if (!visible("main .glass-panel")) state.noPanel += 1
            state.busyNow = visible("main [aria-busy=true]")
          }
          const observer = new MutationObserver(record)
          observer.observe(document.body, { subtree: true, childList: true, attributes: true })
          const tick = () => {
            if (state.stopped) return observer.disconnect()
            record()
            requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
          Object.assign(window, { __navRecord: state })
        })

        await nav.getByRole("link", { name: ja.nav[id], exact: true }).click()
        await expect(page.getByRole("heading", { level: 1, name: ja.nav[id] })).toBeVisible()
        // 本文が届き終わるまで記録を続ける
        await expect
          .poll(() => page.evaluate(() => (window as unknown as { __navRecord: { busyNow: boolean } }).__navRecord.busyNow))
          .toBe(false)

        const record = await page.evaluate(() => {
          const state = (window as unknown as { __navRecord: { frames: number; noHeading: number; noPanel: number; stopped: boolean } })
            .__navRecord
          state.stopped = true
          return state
        })
        expect(record.frames, `${id}: 記録できたフレームがある`).toBeGreaterThan(0)
        expect(record.noHeading, `${id}: 見出しが消えたフレームの数`).toBe(0)
        expect(record.noPanel, `${id}: 本文のパネルが消えたフレームの数`).toBe(0)
      }
    },
  )
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
