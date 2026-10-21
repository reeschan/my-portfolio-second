// /api/now のルートのテストで共通に使う道具 (テストではないので *.test.ts にしない)
import { vi } from "vitest"
import { getNowImageStore, type MemoryImageStore } from "@/lib/now/image-store"

export const token = "test-token"

// 保存先は開発用のメモリ (Redis の環境変数を空にする)。本物の Upstash は呼ばない
// 画像の置き場もメモリにする (手元の .env の値で本物の Blob に書かない)。前のテストの画像が残らないよう、置き場を作り直す
export function useMemoryStoreEnv() {
  vi.stubEnv("NOW_POST_TOKEN", token)
  vi.stubEnv("NODE_ENV", "test")
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "")
  vi.stubEnv("KV_REST_API_URL", "")
  vi.stubEnv("NOW_IMAGES_BLOB_READ_WRITE_TOKEN", "")
  // Slack への通知は、確かめるテストだけが設定する (手元の .env の値で本物に送らない)
  vi.stubEnv("SLACK_WEBHOOK_URL", "")
  delete (globalThis as { __nowMemoryImageStore?: MemoryImageStore }).__nowMemoryImageStore
}

// メモリの画像の置き場 (useMemoryStoreEnv のあとで呼ぶ)。置かれた画像の URL を urls() で確かめる
export function memoryImageStore(): MemoryImageStore {
  return getNowImageStore() as MemoryImageStore
}

export const slackWebhook = "https://hooks.slack.com/services/T000/B000/secret"

// Slack への通知を確かめる準備。Webhook を設定し、fetch をモックして送った本文を返す
export function useSlackMock() {
  vi.stubEnv("SLACK_WEBHOOK_URL", slackWebhook)
  const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(new Response("ok")))
  vi.stubGlobal("fetch", fetchMock)
  return {
    sent: () =>
      fetchMock.mock.calls
        .filter(([url]) => url === slackWebhook)
        .map(([, init]) => JSON.parse(init?.body as string) as { text: string; blocks: { text: { text: string } }[] }),
  }
}

export function jsonRequest(method: string, path: string, body?: unknown, auth: string | null = token) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  })
}

// multipart/form-data のリクエスト。Content-Type (boundary 付き) は FormData から Request が付ける
// 値に配列を渡すと、同じ名前の欄を並べて足す (images に画像を何枚も送るため)
export function formRequest(method: string, path: string, fields: Record<string, string | File | File[]>, auth: string | null = token) {
  const form = new FormData()
  for (const [name, value] of Object.entries(fields)) {
    for (const item of Array.isArray(value) ? value : [value]) form.append(name, item)
  }
  return new Request(`http://localhost${path}`, {
    method,
    headers: auth ? { Authorization: `Bearer ${auth}` } : {},
    body: form,
  })
}

export const paramsOf = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) })

// ---- 画像のファイル (中身の検査を通る最小のもの) ----

const encoder = new TextEncoder()

export function svgFile(name: string, width = 40, height = 30, note = ""): File {
  return new File([`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><!--${note}--></svg>`], name, {
    type: "image/svg+xml",
  })
}

const be32 = (value: number) => [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff]

// PNG はシグネチャと IHDR だけ (幅と高さは IHDR から読まれる)
export function pngFile(name: string, width = 64, height = 48): File {
  const bytes = Uint8Array.from([
    ...[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    ...be32(13),
    ...encoder.encode("IHDR"),
    ...be32(width),
    ...be32(height),
    ...[8, 6, 0, 0, 0],
    ...be32(0),
  ])
  return new File([bytes], name, { type: "image/png" })
}

export function mdFile(text: string, name = "post.md"): File {
  return new File([text], name, { type: "text/markdown" })
}
