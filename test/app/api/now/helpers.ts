// /api/now のルートのテストで共通に使う道具 (テストではないので *.test.ts にしない)
import { vi, type Mock } from "vitest"
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
  // 自動訳も、確かめるテストだけが useKimiMock でキーを設定する (手元の .env の値で本物の LLM を呼ばない)
  vi.stubEnv("MOONSHOT_API_KEY", "")
  delete (globalThis as { __nowMemoryImageStore?: MemoryImageStore }).__nowMemoryImageStore
}

// メモリの画像の置き場 (useMemoryStoreEnv のあとで呼ぶ)。置かれた画像の URL を urls() で確かめる
export function memoryImageStore(): MemoryImageStore {
  return getNowImageStore() as MemoryImageStore
}

export const slackWebhook = "https://hooks.slack.com/services/T000/B000/secret"

type SlackPayload = { text: string; blocks: { text: { text: string } }[] }

// Slack の Webhook に送った本文だけを取り出す
function sentTo(fetchMock: Mock<typeof fetch>): SlackPayload[] {
  return fetchMock.mock.calls.filter(([url]) => url === slackWebhook).map(([, init]) => JSON.parse(init?.body as string) as SlackPayload)
}

// Slack への通知を確かめる準備。Webhook を設定し、fetch をモックして送った本文を返す
export function useSlackMock() {
  vi.stubEnv("SLACK_WEBHOOK_URL", slackWebhook)
  const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(new Response("ok")))
  vi.stubGlobal("fetch", fetchMock)
  return {
    sent: () => sentTo(fetchMock),
  }
}

// 自動訳のテストで使う Kimi (Moonshot) の URL。手元の .env の設定に左右されないよう、モックと一緒に固定する
export const kimiBaseUrl = "https://moonshot.test/v1"
export const kimiApiUrl = `${kimiBaseUrl}/chat/completions`

// Kimi の非ストリームの応答 (OpenAI 互換)。content は {"title","body"} の JSON の文字列
export function kimiResponse(title: string, body: string, finishReason = "stop") {
  return Response.json({
    choices: [{ message: { content: JSON.stringify({ title, body }) }, finish_reason: finishReason }],
  })
}

export type KimiMockOptions = {
  // Kimi が呼ばれたとき、応答を返す前に呼ぶ。訳の途中で記事を書き換える (消す・変える) テストに使う
  onCall?: () => void | Promise<void>
  // Slack に送れるようにするか。既定は送れるようにする (自動訳の失敗の通知を確かめるため)
  slack?: boolean
}

// Kimi と Slack の両方を fetch のモックで受ける。どちらも同じ fetch を使うので 1 つのモックで振り分ける。
// 本物の LLM・Slack は呼ばない。setTranslation / setReply で応答を、calls / sent で呼ばれた回数を確かめる
export function useKimiMock(options: KimiMockOptions = {}) {
  vi.stubEnv("MOONSHOT_API_KEY", "test-moonshot-key")
  vi.stubEnv("MOONSHOT_BASE_URL", kimiBaseUrl)
  vi.stubEnv("MOONSHOT_MODEL", "")
  vi.stubEnv("SLACK_WEBHOOK_URL", options.slack === false ? "" : slackWebhook)

  const requests: { body: unknown }[] = []
  // 応答は呼ばれるたびに作る (Response の本文は 1 回しか読めないため)
  let reply: () => Response | Promise<Response> = () => kimiResponse("Translated title", "Translated body")
  const fetchMock = vi.fn<typeof fetch>(async (url, init) => {
    const href = typeof url === "string" ? url : url instanceof URL ? url.href : url.url
    if (href === kimiApiUrl) {
      requests.push({ body: typeof init?.body === "string" ? JSON.parse(init.body) : init?.body })
      await options.onCall?.()
      return reply()
    }
    if (href === slackWebhook) return new Response("ok")
    // 想定していない外部呼び出しは、本物に届く前にテストを落とす
    throw new Error(`unexpected fetch: ${href}`)
  })
  vi.stubGlobal("fetch", fetchMock)
  return {
    // Kimi が呼ばれた回数 (0 なら訳していない)
    calls: () => requests.length,
    requests,
    // 訳の題名と本文を差し替える
    setTranslation: (title: string, body: string) => {
      reply = () => kimiResponse(title, body)
    },
    // 失敗 (500 など) を返したいときは、Response を返す関数を渡す
    setReply: (next: () => Response | Promise<Response>) => {
      reply = next
    },
    sent: () => sentTo(fetchMock),
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
