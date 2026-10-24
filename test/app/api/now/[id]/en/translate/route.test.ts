// @perspectives api-contract external-mock
// @routes /api/now/[id]/en/translate
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { POST as translate } from "@/app/api/now/[id]/en/translate/route"
import type { NowPost } from "@/lib/now/schema"
import { getNowStore } from "@/lib/now/store"
import { jsonRequest, paramsOf, useKimiMock, useMemoryStoreEnv } from "../../../helpers"

// revalidateTag はこの環境では動かないので、呼ばれたかどうかだけを見る
const revalidateTag = vi.hoisted(() => vi.fn())
vi.mock("next/cache", () => ({ revalidateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }))

const post: NowPost = {
  id: "p1",
  title: "日本語の題名",
  body: "日本語の本文",
  publishedAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}

const call = (id: string, auth?: string | null) =>
  translate(jsonRequest("POST", `/api/now/${id}/en/translate`, undefined, auth), paramsOf({ id }))
const stored = (id: string) => getNowStore()!.get(id)

describe("POST /api/now/[id]/en/translate", () => {
  beforeEach(() => {
    useMemoryStoreEnv()
    revalidateTag.mockClear()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("訳して 200 で記事全体を返し、auto の英語版を保存して作り置きを捨てる", async () => {
    const kimi = useKimiMock()
    kimi.setTranslation("Kimi title", "Kimi body")
    await getNowStore()!.save(post)

    const res = await call(post.id)
    expect(res.status).toBe(200)
    const body = (await res.json()) as NowPost
    expect(body).toMatchObject({ id: post.id, title: post.title, body: post.body })
    expect(body.en).toMatchObject({ title: "Kimi title", body: "Kimi body", source: "auto" })
    expect(await stored(post.id)).toEqual(body)
    expect(revalidateTag).toHaveBeenCalled()
    expect(kimi.calls()).toBe(1)
    expect(kimi.sent()).toHaveLength(0)
  })

  it("持ち主の訳があっても置き換える", async () => {
    useKimiMock().setTranslation("Kimi title", "Kimi body")
    await getNowStore()!.save({ ...post, en: { title: "mine", body: "my body", source: "owner", updatedAt: "2026-01-02T00:00:00.000Z" } })

    const res = await call(post.id)
    expect(res.status).toBe(200)
    expect((await stored(post.id))?.en).toMatchObject({ title: "Kimi title", body: "Kimi body", source: "auto" })
  })

  it("訳に失敗したら 502 で理由を返し、記事は変えず、Slack に送らない", async () => {
    const kimi = useKimiMock()
    kimi.setReply(() => new Response("boom", { status: 500 }))
    const saved: NowPost = { ...post, en: { title: "mine", body: "my body", source: "owner", updatedAt: "2026-01-02T00:00:00.000Z" } }
    await getNowStore()!.save(saved)

    const res = await call(post.id)
    expect(res.status).toBe(502)
    const body = (await res.json()) as { error: string; reason: string }
    expect(body.error).toBe("英語版を作れませんでした。")
    expect(body.reason).toEqual(expect.any(String))
    expect(body.reason).not.toBe("")
    expect(await stored(post.id)).toEqual(saved)
    expect(revalidateTag).not.toHaveBeenCalled()
    expect(kimi.sent()).toHaveLength(0)
  })

  it("訳の間に日本語が変わったら 409 で、書き換え後の記事のまま、作り置きも捨てない", async () => {
    const edited: NowPost = { ...post, body: "書き換えた本文" }
    await getNowStore()!.save(post)
    useKimiMock({ onCall: () => getNowStore()!.save(edited) })

    const res = await call(post.id)
    expect(res.status).toBe(409)
    expect(await stored(post.id)).toEqual(edited)
    expect((await stored(post.id))?.en).toBeUndefined()
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it("訳の間に記事が消えたら 404 で、記事は戻らない", async () => {
    await getNowStore()!.save(post)
    useKimiMock({ onCall: async () => void (await getNowStore()!.remove(post.id)) })

    const res = await call(post.id)
    expect(res.status).toBe(404)
    expect(await stored(post.id)).toBeNull()
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it("訳の間に持ち主の訳が送られたら 409 で、持ち主の訳のまま", async () => {
    const owned: NowPost = { ...post, en: { title: "mine", body: "my body", source: "owner", updatedAt: "2026-01-02T00:00:00.000Z" } }
    await getNowStore()!.save(post)
    useKimiMock({ onCall: () => getNowStore()!.save(owned) })

    const res = await call(post.id)
    expect(res.status).toBe(409)
    expect(await stored(post.id)).toEqual(owned)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it("MOONSHOT_API_KEY が無いと 503 で、Kimi を呼ばない", async () => {
    const kimi = useKimiMock()
    vi.stubEnv("MOONSHOT_API_KEY", "")
    await getNowStore()!.save(post)

    const res = await call(post.id)
    expect(res.status).toBe(503)
    expect(kimi.calls()).toBe(0)
    expect((await stored(post.id))?.en).toBeUndefined()
  })

  it("記事が無いと 404 で、Kimi を呼ばない", async () => {
    const kimi = useKimiMock()
    const res = await call("missing")
    expect(res.status).toBe(404)
    expect(kimi.calls()).toBe(0)
  })

  it("トークンが無いと 401 で、Kimi を呼ばない", async () => {
    const kimi = useKimiMock()
    await getNowStore()!.save(post)
    const res = await call(post.id, null)
    expect(res.status).toBe(401)
    expect(kimi.calls()).toBe(0)
  })
})
