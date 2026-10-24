// @perspectives api-contract
// @routes /api/now/[id]/en
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DELETE, PUT } from "@/app/api/now/[id]/en/route"
import { POST } from "@/app/api/now/route"
import type { NowPost } from "@/lib/now/schema"
import { getNowStore } from "@/lib/now/store"
import { formRequest, jsonRequest, mdFile, paramsOf, pngFile, svgFile, useMemoryStoreEnv } from "../../helpers"

// POST (記事の作成) が after() を呼ぶので、リクエストの外でも動くよう溜めるだけにする
const afterTasks = vi.hoisted(() => [] as (() => unknown)[])
vi.mock("next/server", () => ({ after: (task: () => unknown) => void afterTasks.push(task) }))

// revalidateTag はこの環境では動かないので、呼ばれたかどうかだけを見る。
// lib/now/cached.ts が next/cache から使う関数も、モックに無いと import の時点で落ちるので並べておく
const revalidateTag = vi.hoisted(() => vi.fn())
vi.mock("next/cache", () => ({ revalidateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }))

const imageBody = "![構成図](arch-light.svg)\n\n![画面](shot.png)"

// 画像つきの日本語の記事を作る
async function createWithImages(): Promise<NowPost> {
  const images = [svgFile("arch-light.svg"), svgFile("arch-dark.svg", 40, 30, "dark"), pngFile("shot.png")]
  const res = await POST(
    formRequest("POST", "/api/now", { file: mdFile(`# 日本語の題名\n\n${imageBody}`), title: "日本語の題名", images }),
    paramsOf({}),
  )
  expect(res.status).toBe(201)
  // 記事の作成も作り置きを捨てるので、このあとの PUT・DELETE の分だけを見られるよう消しておく
  revalidateTag.mockClear()
  return (await res.json()) as NowPost
}

const putJson = (id: string, body: unknown, auth?: string | null) =>
  PUT(jsonRequest("PUT", `/api/now/${id}/en`, body, auth), paramsOf({ id }))
const putForm = (id: string, fields: Parameters<typeof formRequest>[2]) =>
  PUT(formRequest("PUT", `/api/now/${id}/en`, fields), paramsOf({ id }))
const del = (id: string, auth?: string | null) => DELETE(jsonRequest("DELETE", `/api/now/${id}/en`, undefined, auth), paramsOf({ id }))
const stored = (id: string) => getNowStore()!.get(id)

describe("PUT /api/now/[id]/en", () => {
  beforeEach(() => {
    useMemoryStoreEnv()
    revalidateTag.mockClear()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    afterTasks.length = 0
  })

  it("JSON の題名と本文を持ち主の訳として保存し、記事全体を 200 で返す。日本語と画像の対応表は変わらない", async () => {
    const original = await createWithImages()
    const res = await putJson(original.id, { title: "English title", body: `Body\n\n${imageBody}` })
    expect(res.status).toBe(200)
    const post = (await res.json()) as NowPost
    expect(post.en).toMatchObject({ title: "English title", body: `Body\n\n${imageBody}`, source: "owner" })
    expect(Number.isNaN(Date.parse(post.en?.updatedAt ?? ""))).toBe(false)
    expect(post).toEqual({ ...original, en: post.en })
    expect(await stored(original.id)).toEqual(post)
    expect(revalidateTag).toHaveBeenCalled()
  })

  it("自動訳があれば持ち主の訳で置き換える", async () => {
    const original = await createWithImages()
    await getNowStore()!.save({ ...original, en: { title: "auto", body: "auto body", source: "auto", updatedAt: "2026-01-01T00:00:00Z" } })
    const res = await putJson(original.id, { title: "mine", body: "my body" })
    expect(res.status).toBe(200)
    expect((await stored(original.id))?.en).toMatchObject({ title: "mine", body: "my body", source: "owner" })
  })

  it("publishedAt は読み捨てる", async () => {
    const original = await createWithImages()
    const res = await putJson(original.id, { title: "t", body: "b", publishedAt: "2020-01-01T00:00:00Z" })
    expect(res.status).toBe(200)
    expect((await stored(original.id))?.publishedAt).toBe(original.publishedAt)
  })

  it("multipart の file で、題名を省くとファイル先頭の # 見出しが題名になり本文から外れる", async () => {
    const original = await createWithImages()
    const res = await putForm(original.id, { file: mdFile("# Heading title\n\nEnglish body\n") })
    expect(res.status).toBe(200)
    const post = (await res.json()) as NowPost
    expect(post.en).toMatchObject({ title: "Heading title", body: "English body", source: "owner" })
    expect(post.en?.body).not.toContain("Heading title")
  })

  it("multipart の title 欄があれば、それを題名にして本文はそのまま", async () => {
    const original = await createWithImages()
    const res = await putForm(original.id, { file: mdFile("# Heading\n\nBody"), title: "Given title" })
    expect(((await res.json()) as NowPost).en).toMatchObject({ title: "Given title", body: "# Heading\n\nBody" })
  })

  it("記事の対応表にある画像だけを参照する本文は通り、対応表と画像は変わらない", async () => {
    const original = await createWithImages()
    const res = await putJson(original.id, { title: "t", body: "![diagram](arch-light.svg)" })
    expect(res.status).toBe(200)
    expect(((await res.json()) as NowPost).images).toEqual(original.images)
    expect((await stored(original.id))?.images).toEqual(original.images)
  })

  it.each([
    ["対応表に無い画像", "![none](none.svg)"],
    ["外部の画像", "![ext](https://example.com/a.png)"],
    ["代替テキストの無い画像", "![](arch-light.svg)"],
  ])("%sを参照したら 400 で issues を返し、保存しない", async (_name, body) => {
    const original = await createWithImages()
    const res = await putJson(original.id, { title: "t", body })
    expect(res.status).toBe(400)
    expect(((await res.json()) as { issues: unknown[] }).issues.length).toBeGreaterThan(0)
    expect(await stored(original.id)).toEqual(original)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it("multipart で images を送ったら 400", async () => {
    const original = await createWithImages()
    const res = await putForm(original.id, { file: mdFile("# T\n\n![a](new.svg)"), images: [svgFile("new.svg")] })
    expect(res.status).toBe(400)
    expect(await stored(original.id)).toEqual(original)
  })

  it("multipart に file が無ければ 400", async () => {
    const original = await createWithImages()
    expect((await putForm(original.id, { title: "t" })).status).toBe(400)
  })

  it.each([
    ["題名が空", { title: "", body: "b" }],
    ["本文が空", { title: "t", body: "  " }],
    ["題名が無い", { body: "b" }],
  ])("%sなら 400 で保存しない", async (_name, input) => {
    const original = await createWithImages()
    expect((await putJson(original.id, input)).status).toBe(400)
    expect(await stored(original.id)).toEqual(original)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it("記事が無ければ 404", async () => {
    const res = await putJson("missing", { title: "t", body: "b" })
    expect(res.status).toBe(404)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it.each([
    ["トークンが無い", null],
    ["トークンが違う", "wrong"],
  ])("%sなら 401 で、保存しない", async (_name, auth) => {
    const original = await createWithImages()
    expect((await putJson(original.id, { title: "t", body: "b" }, auth)).status).toBe(401)
    expect(await stored(original.id)).toEqual(original)
    expect(revalidateTag).not.toHaveBeenCalled()
  })
})

describe("DELETE /api/now/[id]/en", () => {
  beforeEach(() => {
    useMemoryStoreEnv()
    revalidateTag.mockClear()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    afterTasks.length = 0
  })

  it("英語版を外して 204 を返し、作り置きを捨てる。日本語は変わらない", async () => {
    const original = await createWithImages()
    await putJson(original.id, { title: "t", body: "b" })
    revalidateTag.mockClear()

    const res = await del(original.id)
    expect(res.status).toBe(204)
    expect(await stored(original.id)).toEqual(original)
    expect(revalidateTag).toHaveBeenCalled()
  })

  it("英語版の無い記事でも 204", async () => {
    const original = await createWithImages()
    expect((await del(original.id)).status).toBe(204)
    expect(await stored(original.id)).toEqual(original)
  })

  it("記事が無ければ 404", async () => {
    const res = await del("missing")
    expect(res.status).toBe(404)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it("トークンが無ければ 401 で、外さない", async () => {
    const original = await createWithImages()
    await putJson(original.id, { title: "t", body: "b" })
    expect((await del(original.id, null)).status).toBe(401)
    expect((await stored(original.id))?.en).toBeDefined()
  })
})
