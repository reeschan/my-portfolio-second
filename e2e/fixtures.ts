import { test as base, expect } from "@playwright/test"

// 全ページ共通のルート一覧。ページを増やしたらここにも足す (巡回エージェントもこの一覧と app/ を突き合わせる)
export const pages = [
  { path: "/overview", tab: "概要", heading: "概要" },
  { path: "/career", tab: "経歴", heading: "経歴" },
  { path: "/skills", tab: "スキル", heading: "スキル" },
  { path: "/works", tab: "ワーク", heading: "ワーク" },
  { path: "/now", tab: "Now", heading: "Now" },
  { path: "/chat", tab: "チャット", heading: "チャット" },
  { path: "/theme", tab: "テーマ", heading: "テーマ" },
] as const

// テストの対象ルートを示す annotation。scripts/e2e-coverage.mjs がこれを読んでルート×観点の表を作る
export function routes(...paths: string[]) {
  return paths.map((description) => ({ type: "route", description }))
}

// ヘッドレス環境で避けられない既知のノイズ。増やすときは理由をコメントで残す
// (例: ヘッドレス Chromium で WebGL がソフトウェア描画になったときの警告が CI で error として出るようになった場合)
const ignoredConsoleErrors: RegExp[] = []

type Fixtures = {
  // テストが意図して起こすエラー (例: API に 503 を返させる) を test.use({ allowedConsoleErrors: [...] }) で宣言する
  allowedConsoleErrors: RegExp[]
  // 未捕捉の例外と console.error を集め、テスト終了時に 0 件であることを確認する (smoke 観点の共通チェック)
  consoleErrors: string[]
}

export const test = base.extend<Fixtures>({
  allowedConsoleErrors: [[], { option: true }],
  consoleErrors: [
    async ({ page, allowedConsoleErrors }, use) => {
      const errors: string[] = []
      page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`))
      page.on("console", (msg) => {
        if (msg.type() !== "error") return
        const text = msg.text()
        if ([...ignoredConsoleErrors, ...allowedConsoleErrors].some((re) => re.test(text))) return
        errors.push(`console.error: ${text}`)
      })
      await use(errors)
      expect(errors, "ページでエラーが発生しました").toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
