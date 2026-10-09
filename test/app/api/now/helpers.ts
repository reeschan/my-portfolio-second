// /api/now のルートのテストで共通に使う道具 (テストではないので *.test.ts にしない)
import { vi } from "vitest"

export const token = "test-token"

// 保存先は開発用のメモリ (Redis の環境変数を空にする)。本物の Upstash は呼ばない
export function useMemoryStoreEnv() {
  vi.stubEnv("NOW_POST_TOKEN", token)
  vi.stubEnv("NODE_ENV", "test")
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "")
  vi.stubEnv("KV_REST_API_URL", "")
}

export function jsonRequest(method: string, path: string, body?: unknown, auth: string | null = token) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  })
}

export const paramsOf = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) })
