import { test as base, expect, type APIRequestContext } from "@playwright/test"

// 全ページ共通のルート一覧。ページを増やしたらここにも足す (巡回エージェントもこの一覧と app/ を突き合わせる)
export const pages = [
  { path: "/overview", tab: "概要", heading: "概要" },
  { path: "/career", tab: "経歴", heading: "経歴" },
  { path: "/skills", tab: "スキル", heading: "スキル" },
  { path: "/works", tab: "ワーク", heading: "ワーク" },
  { path: "/now", tab: "Now", heading: "Now" },
  { path: "/chat", tab: "チャット", heading: "チャット" },
  { path: "/contact", tab: "お問い合わせ", heading: "お問い合わせ" },
  { path: "/theme", tab: "テーマ", heading: "テーマ" },
] as const

// テストの対象ルートを示す annotation。scripts/e2e-coverage.mjs がこれを読んでルート×観点の表を作る
export function routes(...paths: string[]) {
  return paths.map((description) => ({ type: "route", description }))
}

// E2E が POST /api/now で記事を仕込むときのトークン。playwright.config.ts が webServer に渡す。本番のトークンとは無関係
export const nowPostToken = "e2e-now-post-token"

// 記事を仕込むテストは同じサーバーに並列で投稿するので、題名は毎回一意にする。
// 件数や先頭の記事に頼ると、ほかのテストが足した記事で結果が揺れる
export const uniqueTitle = (label: string) => `${label} ${crypto.randomUUID().slice(0, 8)}`

// POST /api/now で記事を 1 件仕込む。201 を確かめて { id } を返す (e2e/now.spec.ts の createPost と同じ形)
export async function createNowPost(
  request: APIRequestContext,
  post: { title: string; body: string; publishedAt?: string },
): Promise<{ id: string }> {
  const res = await request.post("/api/now", {
    headers: { Authorization: `Bearer ${nowPostToken}` },
    data: post,
  })
  expect(res.status(), await res.text()).toBe(201)
  return (await res.json()) as { id: string }
}

// multipart で送る画像 1 枚 (e2e/now-post-page.spec.ts)
export type NowPostImageUpload = { name: string; mimeType: string; buffer: Buffer }

// 本文の Markdown のファイルと画像を multipart/form-data で POST /api/now に送る (応答はそのまま返す)。
// 画像は images の欄に何度でも入れるので、同じ名前の欄を重ねられる FormData を組んで渡す
export async function postNowPostWithImages(
  request: APIRequestContext,
  post: { title: string; body: string; images: NowPostImageUpload[] },
) {
  const form = new FormData()
  form.append("file", new File([post.body], "post.md", { type: "text/markdown" }))
  form.append("title", post.title)
  // Buffer は ArrayBufferLike を持ちうるので BlobPart にならない。ArrayBuffer の Uint8Array に写して渡す
  for (const image of post.images) form.append("images", new File([new Uint8Array(image.buffer)], image.name, { type: image.mimeType }))
  return request.post("/api/now", { headers: { Authorization: `Bearer ${nowPostToken}` }, multipart: form })
}

// 画像つきの記事を 1 件仕込む。201 を確かめて、id と置いた画像の対応表 (name・url・width・height) を返す
export async function createNowPostWithImages(
  request: APIRequestContext,
  post: { title: string; body: string; images: NowPostImageUpload[] },
): Promise<{ id: string; images: { name: string; url: string; width: number; height: number }[] }> {
  const res = await postNowPostWithImages(request, post)
  expect(res.status(), await res.text()).toBe(201)
  return (await res.json()) as { id: string; images: { name: string; url: string; width: number; height: number }[] }
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
