// @perspectives api-contract external-mock
// @routes /now /api/now
import { afterEach, describe, expect, it, vi } from "vitest"
import type { NowPost } from "./schema"
import { createMemoryStore, createUpstashStore, getNowStore } from "./store"

const post = (id: string, publishedAt: string): NowPost => ({ id, title: id, body: "本文", publishedAt })

describe("createMemoryStore", () => {
  it("公開日の新しい順に返し、消せる", async () => {
    const store = createMemoryStore()
    await store.save(post("old", "2026-01-01T00:00:00.000Z"))
    await store.save(post("new", "2026-02-01T00:00:00.000Z"))
    expect((await store.list()).map((p) => p.id)).toEqual(["new", "old"])

    expect(await store.remove("old")).toBe(true)
    expect(await store.remove("old")).toBe(false)
    expect((await store.list()).map((p) => p.id)).toEqual(["new"])
  })
})

// 本物の Upstash は呼ばない。REST API に送るコマンドと、返り値の読み方を確かめる
describe("createUpstashStore", () => {
  afterEach(() => vi.unstubAllGlobals())

  // Response の本文は 1 回しか読めないので、呼ばれるたびに作り直す
  function mockFetch(result: unknown) {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(() => Promise.resolve(Response.json({ result })))
    vi.stubGlobal("fetch", fetchMock)
    return fetchMock
  }

  it("HGETALL の平らな配列を読み、壊れた値は捨てて新しい順に返す", async () => {
    const a = post("a", "2026-01-01T00:00:00.000Z")
    const b = post("b", "2026-03-01T00:00:00.000Z")
    const fetchMock = mockFetch(["a", JSON.stringify(a), "x", "{broken", "b", JSON.stringify(b), "y", '{"id":"y"}'])

    const posts = await createUpstashStore("https://redis.example", "tok").list()
    expect(posts.map((p) => p.id)).toEqual(["b", "a"])

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe("https://redis.example")
    expect(init?.headers).toMatchObject({ Authorization: "Bearer tok" })
    expect(JSON.parse(init?.body as string)).toEqual(["HGETALL", "now:posts"])
  })

  it("保存は HSET、削除は HDEL で、消した件数で結果を返す", async () => {
    const fetchMock = mockFetch(1)
    const store = createUpstashStore("https://redis.example", "tok")
    const p = post("a", "2026-01-01T00:00:00.000Z")

    await store.save(p)
    expect(JSON.parse(fetchMock.mock.calls[0]![1]?.body as string)).toEqual(["HSET", "now:posts", "a", JSON.stringify(p)])

    expect(await store.remove("a")).toBe(true)
    fetchMock.mockImplementation(() => Promise.resolve(Response.json({ result: 0 })))
    expect(await store.remove("a")).toBe(false)
  })

  it("Upstash がエラーを返したら例外にする", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response("ng", { status: 500 })))
    await expect(createUpstashStore("https://redis.example", "tok").list()).rejects.toThrow("500")
  })
})

describe("getNowStore", () => {
  it("Redis の設定があれば使う (Vercel KV の変数名も読む)", () => {
    expect(getNowStore({ NODE_ENV: "production", KV_REST_API_URL: "https://r", KV_REST_API_TOKEN: "t" })).not.toBeNull()
  })

  it("本番で Redis が未設定なら、メモリを明示しない限り保存先なし", () => {
    expect(getNowStore({ NODE_ENV: "production" })).toBeNull()
    expect(getNowStore({ NODE_ENV: "production", NOW_POSTS_STORE: "memory" })).not.toBeNull()
  })

  it("開発中はメモリを使い、呼び出しをまたいで同じものを返す", () => {
    const env = { NODE_ENV: "development" } as NodeJS.ProcessEnv
    expect(getNowStore(env)).toBe(getNowStore(env))
  })
})
