// /api/now のルートのテストで共通に使う道具 (テストではないので *.test.ts にしない)
import { vi } from "vitest"

export const token = "test-token"

// 保存先は開発用のメモリ (Redis の環境変数を空にする)。本物の Upstash は呼ばない
export function useMemoryStoreEnv() {
  vi.stubEnv("NOW_POST_TOKEN", token)
  vi.stubEnv("NODE_ENV", "test")
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "")
  vi.stubEnv("KV_REST_API_URL", "")
  // Slack への通知は、確かめるテストだけが設定する (手元の .env の値で本物に送らない)
  vi.stubEnv("SLACK_WEBHOOK_URL", "")
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

export const paramsOf = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) })
