// @perspectives api-contract
// @routes /api/now/[id]
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DELETE, PUT } from "@/app/api/now/[id]/route"
import { POST } from "@/app/api/now/route"
import type { NowPost } from "@/lib/now/schema"
import { getNowStore } from "@/lib/now/store"
import { jsonRequest, paramsOf, useMemoryStoreEnv, useSlackMock } from "../helpers"

// after() はリクエストの外では使えないので、渡された処理を溜めておき、テストから実行する
const afterTasks = vi.hoisted(() => [] as (() => unknown)[])
vi.mock("next/server", () => ({ after: (task: () => unknown) => void afterTasks.push(task) }))
const runAfterTasks = () => Promise.all(afterTasks.splice(0).map((task) => task()))

async function create(title = "元の題名"): Promise<NowPost> {
  const res = await POST(jsonRequest("POST", "/api/now", { title, body: "元の本文", publishedAt: "2026-01-01T00:00:00Z" }), paramsOf({}))
  return (await res.json()) as NowPost
}

const put = (id: string, body: unknown, auth?: string | null) => PUT(jsonRequest("PUT", `/api/now/${id}`, body, auth), paramsOf({ id }))
const del = (id: string, auth?: string | null) => DELETE(jsonRequest("DELETE", `/api/now/${id}`, undefined, auth), paramsOf({ id }))
const stored = (id: string) => getNowStore()!.get(id)

describe("PUT /api/now/[id]", () => {
  beforeEach(useMemoryStoreEnv)
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.useRealTimers()
    afterTasks.length = 0
  })

  it("題名と本文を置き換え、公開日を省略したら元のまま、更新日時を付ける", async () => {
    const { id } = await create()
    vi.useFakeTimers({ now: new Date("2026-10-09T00:00:00Z"), toFake: ["Date"] })

    const res = await put(id, { title: "直した題名", body: "直した本文" })
    expect(res.status).toBe(200)
    const expected = {
      id,
      title: "直した題名",
      body: "直した本文",
      publishedAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-10-09T00:00:00.000Z",
    }
    expect(await res.json()).toEqual(expected)
    expect(await stored(id)).toEqual(expected)
  })

  it("公開日を渡せば変えられる", async () => {
    const { id } = await create()
    const res = await put(id, { title: "t", body: "b", publishedAt: "2026-02-01T09:00:00+09:00" })
    expect(((await res.json()) as NowPost).publishedAt).toBe("2026-02-01T00:00:00.000Z")
  })

  it("更新できたら Slack に送り、ない記事なら送らない", async () => {
    const { id } = await create()
    const slack = useSlackMock()

    expect((await put(id, { title: "直した題名", body: "直した本文" })).status).toBe(200)
    expect((await put("missing", { title: "t", body: "b" })).status).toBe(404)
    await runAfterTasks()

    expect(slack.sent().map((m) => m.text)).toEqual([":pencil2: /now の記事を更新しました: 直した題名"])
  })

  it("ない記事なら 404 で、新しく作らない", async () => {
    expect((await put("missing", { title: "t", body: "b" })).status).toBe(404)
    expect(await stored("missing")).toBeNull()
  })

  it("形式が違えば 400 で、書き換えない", async () => {
    const original = await create()
    expect((await put(original.id, { title: "", body: "b" })).status).toBe(400)
    expect(await stored(original.id)).toEqual(original)
  })

  it("トークンが違えば 401 で、書き換えない", async () => {
    const original = await create()
    expect((await put(original.id, { title: "t", body: "b" }, "wrong")).status).toBe(401)
    expect(await stored(original.id)).toEqual(original)
  })
})

describe("DELETE /api/now/[id]", () => {
  beforeEach(useMemoryStoreEnv)
  afterEach(() => vi.unstubAllEnvs())

  it("正しいトークンなら 204 で消し、もう一度消すと 404", async () => {
    const { id } = await create("消す")
    expect((await del(id)).status).toBe(204)
    expect(await stored(id)).toBeNull()
    expect((await del(id)).status).toBe(404)
  })

  it("トークンがなければ 401 で、消さない", async () => {
    const { id } = await create("残す")
    expect((await del(id, null)).status).toBe(401)
    expect(await stored(id)).not.toBeNull()
  })
})
