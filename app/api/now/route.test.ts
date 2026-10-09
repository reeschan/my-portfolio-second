// @perspectives api-contract
// @routes /api/now /api/now/[id]
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getNowStore } from "@/lib/now/store"
import { DELETE } from "./[id]/route"
import { POST } from "./route"

// 保存先は開発用のメモリ (Redis の環境変数を空にする)。本物の Upstash は呼ばない
function postRequest(body: unknown, token: string | null = "test-token") {
  return new Request("http://localhost/api/now", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  })
}

function deleteRequest(id: string, token: string | null = "test-token") {
  const req = new Request(`http://localhost/api/now/${id}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  return DELETE(req, { params: Promise.resolve({ id }) })
}

const listIds = async () => (await getNowStore()!.list()).map((p) => p.id)

describe("POST /api/now", () => {
  beforeEach(() => {
    vi.stubEnv("NOW_POST_TOKEN", "test-token")
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "")
    vi.stubEnv("KV_REST_API_URL", "")
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("正しいトークンなら 201 で保存し、作った記事を返す", async () => {
    const res = await POST(postRequest({ title: " 近況 ", body: "# 本文", publishedAt: "2026-10-09T12:00:00+09:00" }))
    expect(res.status).toBe(201)

    const created = (await res.json()) as { id: string; title: string; body: string; publishedAt: string }
    expect(created).toMatchObject({ title: "近況", body: "# 本文", publishedAt: "2026-10-09T03:00:00.000Z" })
    expect(await listIds()).toContain(created.id)
  })

  it("公開日を省略したら受け付けた時刻にする", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-09T00:00:00Z"), toFake: ["Date"] })
    const res = await POST(postRequest({ title: "t", body: "b" }))
    vi.useRealTimers()
    expect(((await res.json()) as { publishedAt: string }).publishedAt).toBe("2026-10-09T00:00:00.000Z")
  })

  it("トークンが違う・ないなら 401 で、保存しない", async () => {
    const before = await listIds()
    for (const token of ["wrong", null]) {
      const res = await POST(postRequest({ title: "t", body: "b" }, token))
      expect(res.status).toBe(401)
      expect(res.headers.get("WWW-Authenticate")).toContain("Bearer")
    }
    expect(await listIds()).toEqual(before)
  })

  it("サーバーにトークンが未設定なら 503", async () => {
    vi.stubEnv("NOW_POST_TOKEN", "")
    expect((await POST(postRequest({ title: "t", body: "b" }, ""))).status).toBe(503)
  })

  it("本番で保存先が未設定なら 503", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("NOW_POSTS_STORE", "")
    expect((await POST(postRequest({ title: "t", body: "b" }))).status).toBe(503)
  })

  it.each([
    ["JSON でない", "not json"],
    ["題名が空", { title: " ", body: "b" }],
    ["本文がない", { title: "t" }],
    ["題名が長すぎる", { title: "あ".repeat(121), body: "b" }],
    ["公開日が日時でない", { title: "t", body: "b", publishedAt: "昨日" }],
  ])("%s なら 400", async (_, body) => {
    expect((await POST(postRequest(body))).status).toBe(400)
  })
})

describe("DELETE /api/now/[id]", () => {
  beforeEach(() => {
    vi.stubEnv("NOW_POST_TOKEN", "test-token")
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "")
    vi.stubEnv("KV_REST_API_URL", "")
  })
  afterEach(() => vi.unstubAllEnvs())

  it("正しいトークンなら 204 で消し、もう一度消すと 404", async () => {
    const { id } = (await (await POST(postRequest({ title: "消す", body: "b" }))).json()) as { id: string }

    expect((await deleteRequest(id)).status).toBe(204)
    expect(await listIds()).not.toContain(id)
    expect((await deleteRequest(id)).status).toBe(404)
  })

  it("トークンがなければ 401 で、消さない", async () => {
    const { id } = (await (await POST(postRequest({ title: "残す", body: "b" }))).json()) as { id: string }
    expect((await deleteRequest(id, null)).status).toBe(401)
    expect(await listIds()).toContain(id)
  })
})
