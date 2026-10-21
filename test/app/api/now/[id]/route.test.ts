// @perspectives api-contract
// @routes /api/now/[id]
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DELETE, PUT } from "@/app/api/now/[id]/route"
import { POST } from "@/app/api/now/route"
import type { NowPost } from "@/lib/now/schema"
import { getNowStore } from "@/lib/now/store"
import { formRequest, jsonRequest, mdFile, memoryImageStore, paramsOf, pngFile, svgFile, useMemoryStoreEnv, useSlackMock } from "../helpers"

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

// 画像つきの記事 (light/dark の SVG の組と PNG) を multipart で作る
const imageBody = "![構成図](arch-light.svg)\n\n![画面](shot.png)"
async function createWithImages(): Promise<NowPost> {
  const images = [svgFile("arch-light.svg"), svgFile("arch-dark.svg", 40, 30, "dark"), pngFile("shot.png")]
  const res = await POST(formRequest("POST", "/api/now", { file: mdFile(`# 画像つき\n\n${imageBody}`), images }), paramsOf({}))
  expect(res.status).toBe(201)
  return (await res.json()) as NowPost
}
const urlOf = (post: NowPost | null, name: string) => post?.images?.find((image) => image.name === name)?.url
const namesOf = (post: NowPost | null) => (post?.images ?? []).map((image) => image.name).sort()

describe("PUT /api/now/[id]", () => {
  beforeEach(useMemoryStoreEnv)
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.useRealTimers()
    vi.restoreAllMocks()
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

  it("multipart/form-data で直した Markdown のファイルを送っても置き換えられる (公開日は元のまま)", async () => {
    const { id } = await create()
    const file = new File(["# 直した題名\n\n直した本文"], "post.md", { type: "text/markdown" })
    const res = await PUT(formRequest("PUT", `/api/now/${id}`, { file }), paramsOf({ id }))
    expect(res.status).toBe(200)
    expect(await stored(id)).toMatchObject({ title: "直した題名", body: "直した本文", publishedAt: "2026-01-01T00:00:00.000Z" })
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

  describe("画像 (PBI-0024)", () => {
    it("画像を送らない JSON の PUT でも、元の対応表から引き継ぐ", async () => {
      const original = await createWithImages()
      const res = await put(original.id, { title: "直した題名", body: `${imageBody}\n\n追記` })
      expect(res.status).toBe(200)
      expect(((await res.json()) as NowPost).images).toEqual(original.images)
      expect((await stored(original.id))?.images).toEqual(original.images)
      expect(memoryImageStore().urls().sort()).toEqual((original.images ?? []).map((image) => image.url).sort())
    })

    it("本文から外した画像は、対応表からも置き場からも消える (組の -dark も一緒に外れる)", async () => {
      const original = await createWithImages()
      const res = await put(original.id, { title: "t", body: "![画面](shot.png)" })
      expect(res.status).toBe(200)
      const updated = await stored(original.id)
      expect(namesOf(updated)).toEqual(["shot.png"])
      expect(memoryImageStore().urls()).toEqual([urlOf(original, "shot.png")])
    })

    it("中身を変えた画像を送ると置き直し、元の画像を置き場から消す。送らなかった画像は引き継ぐ", async () => {
      const original = await createWithImages()
      const file = mdFile(`# 直した\n\n${imageBody}`)
      const res = await PUT(
        formRequest("PUT", `/api/now/${original.id}`, { file, images: [svgFile("arch-light.svg", 80, 60)] }),
        paramsOf({ id: original.id }),
      )
      expect(res.status).toBe(200)

      const updated = (await res.json()) as NowPost
      expect(namesOf(updated)).toEqual(["arch-dark.svg", "arch-light.svg", "shot.png"])
      expect(updated.images?.find((image) => image.name === "arch-light.svg")).toMatchObject({ width: 80, height: 60 })
      expect(urlOf(updated, "arch-light.svg")).not.toBe(urlOf(original, "arch-light.svg"))
      expect(urlOf(updated, "shot.png")).toBe(urlOf(original, "shot.png"))
      expect((await stored(original.id))?.images).toEqual(updated.images)
      expect(memoryImageStore().urls().sort()).toEqual((updated.images ?? []).map((image) => image.url).sort())
    })

    it("本文の画像が送ったファイルにも元の対応表にも無ければ 400 で、書き換えない", async () => {
      const original = await createWithImages()
      const res = await put(original.id, { title: "t", body: "![無い](none.svg)" })
      expect(res.status).toBe(400)
      expect(((await res.json()) as { issues: { code: string }[] }).issues.map((issue) => issue.code)).toContain("missing")
      expect(await stored(original.id)).toEqual(original)
      expect(memoryImageStore().urls()).toHaveLength(3)
    })

    it("外れた画像を消すのに失敗しても 200 で記事は更新し、console.error に残す", async () => {
      const original = await createWithImages()
      vi.spyOn(memoryImageStore(), "removeUrls").mockRejectedValueOnce(new Error("remove failed"))
      const errors = vi.spyOn(console, "error").mockImplementation(() => {})

      const res = await put(original.id, { title: "t", body: "![画面](shot.png)" })
      expect(res.status).toBe(200)
      expect(namesOf(await stored(original.id))).toEqual(["shot.png"])
      expect(errors).toHaveBeenCalledWith(`PUT /api/now/${original.id}: 画像を消せませんでした`, expect.any(Error))
    })

    it("記事の保存に失敗したら、今回置いた画像を消し、元の画像は残す", async () => {
      const original = await createWithImages()
      vi.spyOn(getNowStore()!, "save").mockRejectedValueOnce(new Error("save failed"))
      vi.spyOn(console, "error").mockImplementation(() => {})

      const file = mdFile(`# 直した\n\n${imageBody}`)
      const res = await PUT(
        formRequest("PUT", `/api/now/${original.id}`, { file, images: [svgFile("arch-light.svg", 80, 60)] }),
        paramsOf({ id: original.id }),
      )
      expect(res.status).toBe(500)
      expect(await stored(original.id)).toEqual(original)
      expect(memoryImageStore().urls().sort()).toEqual((original.images ?? []).map((image) => image.url).sort())
    })
  })
})

describe("DELETE /api/now/[id]", () => {
  beforeEach(useMemoryStoreEnv)
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

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

  it("記事を消したら、その記事の画像も置き場から消す (ほかの記事の画像は残す)", async () => {
    const target = await createWithImages()
    const other = await createWithImages()
    expect((await del(target.id)).status).toBe(204)
    expect(memoryImageStore().urls().sort()).toEqual((other.images ?? []).map((image) => image.url).sort())
  })

  it("画像を消すのに失敗しても 204 で記事は消し、console.error に残す", async () => {
    const { id } = await createWithImages()
    vi.spyOn(memoryImageStore(), "removePost").mockRejectedValueOnce(new Error("remove failed"))
    const errors = vi.spyOn(console, "error").mockImplementation(() => {})

    expect((await del(id)).status).toBe(204)
    expect(await stored(id)).toBeNull()
    expect(errors).toHaveBeenCalledWith(`DELETE /api/now/${id}: 画像を消せませんでした`, expect.any(Error))
  })
})
