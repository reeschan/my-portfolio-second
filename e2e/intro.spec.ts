import { ja } from "../data/messages/ja"
import { expect, routes, test } from "./fixtures"

// トップの導入演出と、3D 背景への引き継ぎ (docs/specs/intro-handoff.md の合意済みの seam 1)。
// 演出の途中のコマや内部の状態には依らず、閲覧者から見えるもの・押せるもの・移る先だけを確かめる。
// 3D 背景の canvas は、テーマの一覧ではなく背景の枠 (data-background-theme) の中から取る

test.describe("トップの導入演出", () => {
  // 全体の設定 (playwright.config.ts) は動きを止めているので、演出そのものを確かめるここでは戻す
  test.use({ reducedMotion: "no-preference" })

  test("トップを開くと導入演出が出る", { tag: ["@interaction"], annotation: routes("/") }, async ({ page }) => {
    await page.goto("/")
    // 飾りの英字ではなく、読み上げ用の「読み込み中」で層を取る (data/messages/ja.ts の文言)
    await expect(page.getByRole("region", { name: ja.intro.loading })).toBeVisible()
  })

  test("入口は導入演出の最中でも押せて、押すと概要に移る", { tag: ["@interaction"], annotation: routes("/") }, async ({ page }) => {
    await page.goto("/")
    // 演出の終わりを待たずに押す。入口は最初の HTML にあり、演出の層は pointer-events: none なので押せる
    await page.getByRole("link", { name: "Enter" }).click()
    await expect(page).toHaveURL(/\/overview$/)
  })

  test("導入演出が終わると 3D 背景と見出しに引き継がれる", { tag: ["@interaction"], annotation: routes("/") }, async ({ page }) => {
    // 演出の 5 秒と、背景の準備完了 (CI のソフトウェア描画では遅い) の両方を待つので、テスト全体を長めにする
    test.setTimeout(60_000)
    await page.goto("/")

    // 背景のシーンは遅延読み込みなので、canvas が出るまで長めに待つ (e2e/background-theme.spec.ts の先例)
    await expect(page.locator("[data-background-theme] canvas")).toBeVisible({ timeout: 15_000 })
    // 引き継ぎでは層を 1 秒かけて薄くし、そのあと visibility を hidden にする
    await expect(page.getByRole("region", { name: ja.intro.loading })).toBeHidden({ timeout: 15_000 })
    // 見出しは導入演出のあいだ透明で、引き継ぎのあとに 0.8 秒かけて不透明になる
    await expect(page.getByRole("heading", { level: 1, name: /Ryuki Tobita\s*Portfolio/ })).toHaveCSS("opacity", "1", {
      timeout: 15_000,
    })
  })

  test(
    "サイト内の移動でトップに戻ったときは導入演出が出ない",
    { tag: ["@interaction", "@navigation"], annotation: routes("/") },
    async ({ page }) => {
      test.setTimeout(60_000)
      await page.goto("/")
      // 一度引き継ぎまで進めて、背景の準備完了を済ませてから移動する
      await expect(page.locator("[data-background-theme] canvas")).toBeVisible({ timeout: 15_000 })
      await expect(page.getByRole("region", { name: ja.intro.loading })).toBeHidden({ timeout: 15_000 })

      await page.getByRole("link", { name: "Enter" }).click()
      await expect(page).toHaveURL(/\/overview$/)
      await page.goBack()
      await expect(page).toHaveURL(/\/$/)

      // 準備完了が済んでいるので、戻ったときは層を最初から出さない。層が無い場合も hidden と判定される
      await expect(page.getByRole("region", { name: ja.intro.loading })).toBeHidden()
    },
  )

  test(
    "トップ以外のページに直接入ったときは導入演出が出ない",
    { tag: ["@interaction", "@navigation"], annotation: routes("/overview") },
    async ({ page }) => {
      await page.goto("/overview")
      // 導入演出はトップだけのもの。ほかのページの HTML には層そのものを含めない
      await expect(page.getByRole("region", { name: ja.intro.loading })).toHaveCount(0)
    },
  )

  test("入口に glass-button が当たっている", { tag: ["@interaction", "@theme"], annotation: routes("/") }, async ({ page }) => {
    await page.goto("/")
    // ガラスの面は backdrop-filter のぼかしで作る。生の色ではなく共通のユーティリティが当たっていることを見る
    await expect(page.getByRole("link", { name: "Enter" })).toHaveCSS("backdrop-filter", /blur/)
  })
})

test.describe("視差効果を減らす設定", () => {
  test.use({ reducedMotion: "reduce" })

  test(
    "演出を止めても、3D 背景と見出しへの引き継ぎが起きる",
    { tag: ["@interaction", "@a11y"], annotation: routes("/") },
    async ({ page }) => {
      test.setTimeout(60_000)
      await page.goto("/")

      // 視差効果を減らす設定では、演出の時計だけが 1 秒で終わり、止まった 3D 背景に引き継ぐ
      await expect(page.locator("[data-background-theme] canvas")).toBeVisible({ timeout: 15_000 })
      await expect(page.getByRole("region", { name: ja.intro.loading })).toBeHidden({ timeout: 15_000 })
      await expect(page.getByRole("heading", { level: 1, name: /Ryuki Tobita\s*Portfolio/ })).toHaveCSS("opacity", "1", {
        timeout: 15_000,
      })
    },
  )
})
