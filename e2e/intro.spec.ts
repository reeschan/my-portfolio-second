import { ja } from "../data/messages/ja"
import { expect, routes, test } from "./fixtures"

// トップの導入演出と、その完了 (docs/specs/intro-complete.md の合意済みの seam 1)。
// 演出の途中のコマや内部の状態には依らず、閲覧者から見えるもの・押せるもの・移る先・領域と見出しの名前だけを確かめる。
// 3D 背景の canvas は、テーマの一覧ではなく背景の枠 (data-background-theme) の中から取る

// 見出しは導入演出の最後のコマの名前と「Portfolio」
const heading = { level: 1, name: /Ryuki Tobita\s+Portfolio/ } as const

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

  test("演出のあと、最後の姿のまま完了になる", { tag: ["@interaction"], annotation: routes("/") }, async ({ page }) => {
    // 演出の 5 秒と、背景の準備完了 (CI のソフトウェア描画では遅い。来なければ 8 秒の上限) を待つので、長めにする
    test.setTimeout(60_000)
    await page.goto("/")

    // 完了すると、領域の名前が「読み込み完了」に替わる。層は消えずに残る
    await expect(page.getByRole("region", { name: ja.intro.complete })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole("region", { name: ja.intro.loading })).toHaveCount(0)
    // 見出しは最後のコマの名前。完了のあとも見えていて、入口も押せる
    await expect(page.getByRole("heading", heading)).toBeVisible()
    await expect(page.getByRole("link", { name: "Enter" })).toBeVisible()
  })

  test(
    "完了してから本文に入ると 3D 背景が出て、トップに戻ると最初から完了の姿で出る",
    { tag: ["@interaction", "@navigation"], annotation: routes("/") },
    async ({ page }) => {
      test.setTimeout(60_000)
      await page.goto("/")
      await expect(page.getByRole("region", { name: ja.intro.complete })).toBeVisible({ timeout: 20_000 })

      await page.getByRole("link", { name: "Enter" }).click()
      await expect(page).toHaveURL(/\/overview$/)
      // トップでは裏で読み込むだけだった 3D 背景が、本文に入ると見える (遅延読み込みなので長めに待つ)
      await expect(page.locator("[data-background-theme] canvas")).toBeVisible({ timeout: 15_000 })

      await page.goBack()
      await expect(page).toHaveURL(/\/$/)
      // 戻ったときは演出を流し直さず、最初から完了の姿で出る (読み込み中の名前を経ない)
      await expect(page.getByRole("region", { name: ja.intro.loading })).toHaveCount(0)
      await expect(page.getByRole("region", { name: ja.intro.complete })).toBeVisible()
      await expect(page.getByRole("heading", heading)).toBeVisible()
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

  test("演出を止めても、完了になる", { tag: ["@interaction", "@a11y"], annotation: routes("/") }, async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto("/")

    // 視差効果を減らす設定では、開いた瞬間に演出が終わったとみなし、背景の準備完了 (か 8 秒の上限) で完了になる
    await expect(page.getByRole("region", { name: ja.intro.complete })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole("heading", heading)).toBeVisible()
  })
})
