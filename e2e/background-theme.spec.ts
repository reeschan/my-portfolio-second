import { ja } from "../data/messages/ja"
import { BACKGROUND_DPR_MIN, isSoftwareRenderer } from "../lib/background-frame"
import { backgroundThemes as themeData, defaultBackgroundThemeId } from "../lib/background-theme"
import { expect, routes, test } from "./fixtures"

// テーマの表示名と説明は data/messages/ にある。既定の言語 (日本語) の文言と組にして使う
const backgroundThemes = themeData.map((theme) => ({ ...theme, ...ja.theme.themes[theme.id] }))

// /theme で 3D 背景のテーマを選ぶ (docs/pbi/0002-background-themes)。
// 描画結果のピクセルは比べず、「どのテーマのシーンが載っているか」を背景の枠の data-background-theme で確かめる
const canvasSelector = "[data-background-theme]"

test.describe("背景テーマ", () => {
  // 全体の設定 (playwright.config.ts) は動きを止めているので戻す。止めると 1 枚しか描かず、
  // 毎フレームの処理で起きるエラーをテーマごとの描画の smoke が見逃すため
  test.use({ reducedMotion: "no-preference" })

  test(
    "テーマの一覧が data の並びどおりに出て、既定のテーマが選ばれている",
    { tag: ["@content", "@responsive"], annotation: routes("/theme") },
    async ({ page }) => {
      await page.goto("/theme")
      const group = page.getByRole("group", { name: "背景のテーマ" })
      await expect(group.getByRole("radio")).toHaveCount(backgroundThemes.length)

      for (const theme of backgroundThemes) {
        const radio = group.getByRole("radio", { name: theme.label })
        await expect(radio).toBeAttached()
        await expect(radio).toHaveAccessibleDescription(theme.description)
      }
      const defaultLabel = backgroundThemes.find((t) => t.id === defaultBackgroundThemeId)!.label
      await expect(group.getByRole("radio", { name: defaultLabel })).toBeChecked()
      await expect(page.locator(canvasSelector)).toHaveAttribute("data-background-theme", defaultBackgroundThemeId)
    },
  )

  test(
    "テーマを選ぶと背景のシーンが切り替わる",
    { tag: ["@interaction", "@responsive"], annotation: routes("/theme") },
    async ({ page }) => {
      await page.goto("/theme")
      const group = page.getByRole("group", { name: "背景のテーマ" })

      for (const theme of backgroundThemes) {
        await group.getByText(theme.label, { exact: true }).click()
        await expect(group.getByRole("radio", { name: theme.label })).toBeChecked()
        await expect(page.locator(canvasSelector)).toHaveAttribute("data-background-theme", theme.id)
      }
    },
  )

  test("矢印キーでもテーマを選べる", { tag: "@interaction", annotation: routes("/theme") }, async ({ page }) => {
    await page.goto("/theme")
    const group = page.getByRole("group", { name: "背景のテーマ" })
    const [first, second] = backgroundThemes
    if (!first || !second) throw new Error("矢印キーで移るには背景テーマが 2 つ以上要る")
    await group.getByRole("radio", { name: first.label }).focus()
    await page.keyboard.press("ArrowDown")
    await expect(group.getByRole("radio", { name: second.label })).toBeChecked()
    await expect(page.locator(canvasSelector)).toHaveAttribute("data-background-theme", second.id)
  })

  // 保存済みのテーマは、既定のテーマが替わっても上書きしない (閲覧者が選んだものを尊重する)。
  // localStorage のキーは lib/background-theme.ts の storageKey と同じ値。あちらはキーを export していないので、ここでは定数で持つ
  const storageKey = "background-theme"

  test(
    "保存済みのテーマは、既定のテーマが変わってもそのまま出る",
    { tag: ["@interaction", "@navigation"], annotation: routes("/overview", "/theme") },
    async ({ page }) => {
      const theme = backgroundThemes.find((t) => t.id !== defaultBackgroundThemeId)
      if (!theme) throw new Error("既定でない背景テーマが要る")
      // 読み込みの最初から保存を優先することを確かめたいので、ページを開く前に保存済みの閲覧者を作る
      await page.addInitScript(({ key, id }) => window.localStorage.setItem(key, id), { key: storageKey, id: theme.id })

      await page.goto("/overview")
      await expect(page.locator(canvasSelector)).toHaveAttribute("data-background-theme", theme.id)

      await page.goto("/theme")
      await expect(page.getByRole("group", { name: "背景のテーマ" }).getByRole("radio", { name: theme.label })).toBeChecked()
    },
  )

  // 新しいテーマはどれもシェーダーを使うので、全テーマを実際に描かせてエラー (シェーダーのコンパイル失敗など) が出ないことを確かめる。
  // console.error と未捕捉例外は fixtures の自動検査が拾う
  for (const theme of backgroundThemes) {
    test(`「${theme.label}」のシーンがエラーなく描画される`, { tag: "@smoke", annotation: routes("/theme") }, async ({ page }) => {
      test.setTimeout(120_000)
      await page.addInitScript((id) => window.localStorage.setItem("background-theme", id), theme.id)
      await page.goto("/theme")
      const el = page.locator(canvasSelector)
      await expect(el).toHaveAttribute("data-background-theme", theme.id)
      // テーマのシーンは遅延読み込みなので、canvas が出るまで長めに待つ。
      // CI のヘッドレス Chromium は WebGL をソフトウェア (SwiftShader) で描くため、重いシェーダーは 1 フレームに数秒かかる
      await expect(el.locator("canvas")).toBeVisible({ timeout: 30_000 })
      // シェーダーのコンパイルと 2 フレームの描画を待つ (固定の待ち時間ではなく、描画が進んだことを確かめる)
      await expect
        .poll(() => page.evaluate(() => new Promise<number>((r) => requestAnimationFrame(() => requestAnimationFrame((t) => r(t))))), {
          timeout: 60_000,
        })
        .toBeGreaterThan(0)
    })
  }

  // ソフトウェア描画 (GPU の無い CI など) では、全画面のシェーダーがページの操作を詰まらせないよう、
  // 最初から最小の解像度で描く (ADR 0012)。判定はアプリと同じ isSoftwareRenderer に任せる
  test("ソフトウェア描画では背景を最小の解像度で描く", { tag: "@performance", annotation: routes("/") }, async ({ page }) => {
    // 待ちの上限が 15 秒 × 2 あり、GPU の無い環境ではシェーダーの準備も遅いので、テスト全体を長めにする
    test.setTimeout(60_000)
    await page.goto("/overview")
    const canvas = page.locator(`${canvasSelector} canvas`)
    await expect(canvas).toBeVisible({ timeout: 15_000 })

    // page.evaluate の中では Node 側の関数を呼べないので、レンダラー名の文字列だけを返して、判定はここで行う。
    // Chromium の RENDERER は「WebKit WebGL」としか返さないため、デバッグ用の拡張があるときだけ実際の名前も見る
    const renderer = await page.evaluate(() => {
      const gl = document.createElement("canvas").getContext("webgl")
      if (!gl) return ""
      const names = [String(gl.getParameter(gl.RENDERER))]
      const extension = gl.getExtension("WEBGL_debug_renderer_info")
      if (extension) names.push(String(gl.getParameter(extension.UNMASKED_RENDERER_WEBGL)))
      return names.join(" ")
    })
    // 本物の GPU では解像度を最小にする分岐を通らないので、確かめようがない
    if (!isSoftwareRenderer(renderer)) test.skip(true, "GPU のある環境ではソフトウェア描画の分岐を通らない")

    // 解像度はレンダラーを知ってから切り替わるので、反映されるまで待つ。
    // 期待値は表示の幅と最小の倍率からその都度計算する (描画バッファは端末の画素で数える)
    await expect
      .poll(
        async () => {
          const { width, clientWidth } = await canvas.evaluate((el: HTMLCanvasElement) => ({
            width: el.width,
            clientWidth: el.clientWidth,
          }))
          return Math.abs(width - clientWidth * BACKGROUND_DPR_MIN)
        },
        { timeout: 15_000 },
      )
      .toBeLessThanOrEqual(2)
  })
})

// prefers-reduced-motion: reduce のときは、背景を動かさず止まった 1 枚だけを描く (frameloop "demand"。PBI-0025)。
// 描画の回し方が変わっても、canvas が出て、選んだテーマのシーンが載っていることを確かめる
test.describe("視差効果を減らす設定", () => {
  test.use({ reducedMotion: "reduce" })

  // 既定のテーマと、それ以外のテーマ 1 つ (月夜の海) を選ぶ
  const targets = [defaultBackgroundThemeId, "moonlit-sea"].map((id) => backgroundThemes.find((t) => t.id === id)!)

  test(
    "テーマを選ぶと、止まった背景としてそのテーマのシーンが描かれる",
    { tag: "@interaction", annotation: routes("/theme") },
    async ({ page }) => {
      test.setTimeout(120_000)
      await page.goto("/theme")
      const group = page.getByRole("group", { name: "背景のテーマ" })
      const el = page.locator(canvasSelector)

      for (const theme of targets) {
        await group.getByText(theme.label, { exact: true }).click()
        await expect(group.getByRole("radio", { name: theme.label })).toBeChecked()
        await expect(el).toHaveAttribute("data-background-theme", theme.id)
        // テーマのシーンは遅延読み込みで、CI のヘッドレス Chromium は WebGL をソフトウェアで描くため長めに待つ
        await expect(el.locator("canvas")).toBeVisible({ timeout: 30_000 })
        // シェーダーのコンパイルと描画が進んだことを、rAF が 2 回回ることで確かめる (固定の待ち時間は使わない)
        await expect
          .poll(() => page.evaluate(() => new Promise<number>((r) => requestAnimationFrame(() => requestAnimationFrame((t) => r(t))))), {
            timeout: 60_000,
          })
          .toBeGreaterThan(0)
      }
    },
  )
})
