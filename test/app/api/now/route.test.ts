// @perspectives api-contract
// @routes /api/now
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "@/app/api/now/route"
import { getNowStore } from "@/lib/now/store"
import { jsonRequest, paramsOf, useMemoryStoreEnv } from "./helpers"

const post = (body: unknown, auth?: string | null) => POST(jsonRequest("POST", "/api/now", body, auth), paramsOf({}))
const listIds = async () => (await getNowStore()!.list()).map((p) => p.id)

describe("POST /api/now", () => {
  beforeEach(useMemoryStoreEnv)
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.useRealTimers()
  })

  it("正しいトークンなら 201 で保存し、作った記事と Location を返す", async () => {
    const res = await post({ title: " 近況 ", body: "# 本文", publishedAt: "2026-10-09T12:00:00+09:00" })
    expect(res.status).toBe(201)

    const created = (await res.json()) as { id: string }
    expect(created).toMatchObject({ title: "近況", body: "# 本文", publishedAt: "2026-10-09T03:00:00.000Z" })
    expect(res.headers.get("Location")).toBe(`/api/now/${created.id}`)
    expect(await listIds()).toContain(created.id)
  })

  it("公開日を省略したら受け付けた時刻にする", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-09T00:00:00Z"), toFake: ["Date"] })
    const res = await post({ title: "t", body: "b" })
    expect(((await res.json()) as { publishedAt: string }).publishedAt).toBe("2026-10-09T00:00:00.000Z")
  })

  it("トークンが違えば 401 で、保存しない (認証はデコレータに任せている)", async () => {
    const before = await listIds()
    expect((await post({ title: "t", body: "b" }, "wrong")).status).toBe(401)
    expect(await listIds()).toEqual(before)
  })

  it("本番で保存先が未設定なら 503", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("NOW_POSTS_STORE", "")
    expect((await post({ title: "t", body: "b" })).status).toBe(503)
  })

  it.each([
    ["JSON でない", "not json"],
    ["題名が空", { title: " ", body: "b" }],
    ["本文がない", { title: "t" }],
    ["題名が長すぎる", { title: "あ".repeat(121), body: "b" }],
    ["公開日が日時でない", { title: "t", body: "b", publishedAt: "昨日" }],
  ])("%s なら 400", async (_, body) => {
    expect((await post(body)).status).toBe(400)
  })
})
