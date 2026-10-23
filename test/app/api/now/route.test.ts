// @perspectives api-contract
// @routes /api/now
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "@/app/api/now/route"
import { nowWriteErrors } from "@/lib/now/auth"
import { nowPostsTag } from "@/lib/now/cached"
import type { NowPost } from "@/lib/now/schema"
import { getNowStore } from "@/lib/now/store"
import {
  formRequest,
  jsonRequest,
  mdFile,
  memoryImageStore,
  paramsOf,
  pngFile,
  svgFile,
  token,
  useMemoryStoreEnv,
  useSlackMock,
} from "./helpers"

// after() はリクエストの外では使えないので、渡された処理を溜めておき、テストから実行する
const afterTasks = vi.hoisted(() => [] as (() => unknown)[])
vi.mock("next/server", () => ({ after: (task: () => unknown) => void afterTasks.push(task) }))

// revalidateTag はこの環境では動かないので、呼ばれたかどうかだけを見る。
// lib/now/cached.ts が next/cache から使う関数も、モックに無いと import の時点で落ちるので並べておく
const revalidateTag = vi.hoisted(() => vi.fn())
vi.mock("next/cache", () => ({ revalidateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }))
const runAfterTasks = () => Promise.all(afterTasks.splice(0).map((task) => task()))

const post = (body: unknown, auth?: string | null) => POST(jsonRequest("POST", "/api/now", body, auth), paramsOf({}))
const listIds = async () => (await getNowStore()!.list()).map((p) => p.id)

describe("POST /api/now", () => {
  beforeEach(() => {
    useMemoryStoreEnv()
    revalidateTag.mockClear()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.useRealTimers()
    vi.restoreAllMocks()
    afterTasks.length = 0
  })

  it("正しいトークンなら 201 で保存し、作った記事と Location を返す", async () => {
    const res = await post({ title: " 近況 ", body: "# 本文", publishedAt: "2026-10-09T12:00:00+09:00" })
    expect(res.status).toBe(201)

    const created = (await res.json()) as { id: string }
    expect(created).toMatchObject({ title: "近況", body: "# 本文", publishedAt: "2026-10-09T03:00:00.000Z" })
    expect(res.headers.get("Location")).toBe(`/api/now/${created.id}`)
    expect(await listIds()).toContain(created.id)
    expect(revalidateTag).toHaveBeenCalledWith(nowPostsTag, { expire: 0 })
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
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it("本番で保存先が未設定なら 503", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("NOW_POSTS_STORE", "")
    expect((await post({ title: "t", body: "b" })).status).toBe(503)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it.each([
    ["JSON でない", "not json"],
    ["題名が空", { title: " ", body: "b" }],
    ["本文がない", { title: "t" }],
    ["題名が長すぎる", { title: "あ".repeat(121), body: "b" }],
    ["公開日が日時でない", { title: "t", body: "b", publishedAt: "昨日" }],
  ])("%s なら 400", async (_, body) => {
    expect((await post(body)).status).toBe(400)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  describe("multipart/form-data で Markdown のファイルを送る (Postman 向け)", () => {
    const postForm = (fields: Record<string, string | File>) => POST(formRequest("POST", "/api/now", fields), paramsOf({}))

    it("ファイルの先頭の # 見出しが題名、残りが本文になり、201 で保存する", async () => {
      const res = await postForm({ file: mdFile("# 近況\n\n```mermaid\nflowchart LR\n  A --> B\n```\n") })
      expect(res.status).toBe(201)
      const created = (await res.json()) as { id: string; title: string; body: string }
      expect(created).toMatchObject({ title: "近況", body: "```mermaid\nflowchart LR\n  A --> B\n```" })
      expect(await listIds()).toContain(created.id)
    })

    it("title と publishedAt の欄を指定すればそれを使う。空欄は指定なしとして扱う", async () => {
      const res = await postForm({ file: mdFile("# 見出し\n本文"), title: "別の題名", publishedAt: "2026-10-09T12:00:00+09:00" })
      expect(await res.json()).toMatchObject({ title: "別の題名", body: "# 見出し\n本文", publishedAt: "2026-10-09T03:00:00.000Z" })

      const blank = await postForm({ file: mdFile("本文", "メモ.md"), title: " ", publishedAt: "" })
      expect(await blank.json()).toMatchObject({ title: "メモ", body: "本文" })
    })

    it.each([
      ["file がない", { title: "t" }],
      ["file がテキスト", { file: "本文" }],
      ["ファイルが空", { file: new File([""], "empty.md") }],
    ])("%s なら 400", async (_, fields) => {
      expect((await postForm(fields)).status).toBe(400)
    })

    it("トークンが違えば 401", async () => {
      expect((await POST(formRequest("POST", "/api/now", { file: mdFile("# t\nb") }, "wrong"), paramsOf({}))).status).toBe(401)
    })
  })

  it("保存できたら、題名と本文の抜粋と /now へのリンクを Slack に送る (題名のメンションは無効にする)", async () => {
    const slack = useSlackMock()
    const res = await post({ title: "<!channel> 近況", body: "本文" })
    expect(res.status).toBe(201)

    await runAfterTasks()
    const [message] = slack.sent()
    expect(message?.text).toBe(":memo: /now に記事を投稿しました: &lt;!channel&gt; 近況")
    expect(message?.blocks[0]?.text.text).toContain("<http://localhost/now|&lt;!channel&gt; 近況>")
    expect(message?.blocks[1]?.text.text).toBe("本文")
  })

  it("トークンが違う・入力が不正なら Slack に送らない", async () => {
    const slack = useSlackMock()
    expect((await post({ title: "t", body: "b" }, "wrong")).status).toBe(401)
    expect((await post({ title: " ", body: "b" })).status).toBe(400)
    await runAfterTasks()
    expect(slack.sent()).toEqual([])
  })

  describe("multipart の images で画像を送る (PBI-0024)", () => {
    const postImages = (text: string, images: File[]) => POST(formRequest("POST", "/api/now", { file: mdFile(text), images }), paramsOf({}))
    const bodyWithImages = "# 構成\n\n![構成図](assets/arch-light.svg)\n\n![画面](shot.png)\n"
    const images = () => [svgFile("arch-light.svg", 40, 30), svgFile("arch-dark.svg", 40, 30, "dark"), pngFile("shot.png", 64, 48)]

    it("light/dark の SVG の組と PNG を送ると 201 で、対応表を返し、置き場に置いて記事にも保存する", async () => {
      const res = await postImages(bodyWithImages, images())
      expect(res.status).toBe(201)

      const created = (await res.json()) as NowPost
      // 本文は相対パスのまま保存する (描くときに対応表で URL を引く)
      expect(created.body).toBe("![構成図](assets/arch-light.svg)\n\n![画面](shot.png)")
      const byName = Object.fromEntries((created.images ?? []).map((image) => [image.name, image]))
      expect(Object.keys(byName).sort()).toEqual(["arch-dark.svg", "arch-light.svg", "shot.png"])
      expect(byName["arch-light.svg"]).toMatchObject({ width: 40, height: 30, contentType: "image/svg+xml" })
      expect(byName["shot.png"]).toMatchObject({ width: 64, height: 48, contentType: "image/png", bytes: 33 })
      for (const image of created.images ?? []) {
        expect(image.sha256).toMatch(/^[0-9a-f]{64}$/)
        expect(image.url).toMatch(/^data:image\//)
      }
      expect(memoryImageStore().urls().sort()).toEqual((created.images ?? []).map((image) => image.url).sort())
      expect((await getNowStore()!.get(created.id))?.images).toEqual(created.images)
    })

    it.each([
      ["本文の画像のファイルが無い", "![a](a.svg)", [], "missing"],
      ["同じファイル名が 2 つ", "![a](a.svg)", [svgFile("a.svg"), svgFile("a.svg")], "duplicate"],
      ["使われていないファイル", "本文", [svgFile("a.svg")], "unused"],
      ["外部の画像", "![a](https://example.com/a.svg)", [], "external"],
      ["代替テキストが空", "![](a.svg)", [svgFile("a.svg")], "alt"],
      ["形式が拡張子と違う", "![a](a.png)", [svgFile("a.png")], "invalid"],
      ["1 枚が上限を超える", "![a](a.svg)", [new File([new Uint8Array(1024 * 1024 + 1)], "a.svg")], "too-large"],
    ])("%s なら 400 で、問題を details.issues に入れ、記事も画像も保存しない", async (_, text, files, code) => {
      const before = await listIds()
      const res = await postImages(`# t\n\n${text}`, files)
      expect(res.status).toBe(400)
      const json = (await res.json()) as { error: string; issues: { code: string }[] }
      expect(json.error).toBe(nowWriteErrors.invalid)
      expect(json.issues.map((issue) => issue.code)).toContain(code)
      expect(await listIds()).toEqual(before)
      expect(memoryImageStore().urls()).toEqual([])
      expect(revalidateTag).not.toHaveBeenCalled()
    })

    it("Content-Length が 4MB を超えたら、本文を読まずに 413", async () => {
      const request = new Request("http://localhost/api/now", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "Content-Length": String(4 * 1024 * 1024 + 1) },
        body: JSON.stringify({ title: "t", body: "b" }),
      })
      const res = await POST(request, paramsOf({}))
      expect(res.status).toBe(413)
      expect(await res.json()).toEqual({ error: "リクエストが大きすぎます。" })
    })

    describe("本番で画像の置き場のトークンが無いとき", () => {
      // 記事の保存先は Upstash にして (NOW_POSTS_STORE=memory だと画像の置き場もメモリになるため)、Upstash の REST API を fetch のモックで受ける
      let upstashCalls: string[][] = []
      beforeEach(() => {
        vi.stubEnv("NODE_ENV", "production")
        vi.stubEnv("NOW_POSTS_STORE", "")
        vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://upstash.example")
        vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "upstash-token")
        upstashCalls = []
        vi.stubGlobal(
          "fetch",
          vi.fn<typeof fetch>((_url, init) => {
            upstashCalls.push(JSON.parse(init?.body as string) as string[])
            return Promise.resolve(Response.json({ result: 1 }))
          }),
        )
      })

      it("画像つきの投稿は 503 で、記事を保存しない", async () => {
        const res = await postImages(bodyWithImages, images())
        expect(res.status).toBe(503)
        expect(upstashCalls).toEqual([])
      })

      it("画像の無い投稿は今までどおり 201", async () => {
        const res = await post({ title: "t", body: "b" })
        expect(res.status).toBe(201)
        expect(upstashCalls.map(([command]) => command)).toEqual(["HSET"])
      })
    })

    it("記事の保存に失敗したら、置いた画像を消してエラーを返す", async () => {
      vi.spyOn(getNowStore()!, "save").mockRejectedValueOnce(new Error("save failed"))
      vi.spyOn(console, "error").mockImplementation(() => {})
      const res = await postImages(bodyWithImages, images())
      expect(res.status).toBe(500)
      expect(memoryImageStore().urls()).toEqual([])
      expect(revalidateTag).not.toHaveBeenCalled()
    })

    it("記事の保存に失敗して画像も消せなければ、ログに残してエラーを返す", async () => {
      vi.spyOn(getNowStore()!, "save").mockRejectedValueOnce(new Error("save failed"))
      vi.spyOn(memoryImageStore(), "removeUrls").mockRejectedValueOnce(new Error("remove failed"))
      const errors = vi.spyOn(console, "error").mockImplementation(() => {})
      const res = await postImages(bodyWithImages, images())
      expect(res.status).toBe(500)
      expect(errors.mock.calls.some(([message]) => String(message).includes("画像を消せませんでした"))).toBe(true)
    })

    it("画像の 1 枚を置けなければ、置けた分を消してエラーを返し、記事を保存しない", async () => {
      const store = memoryImageStore()
      const original = store.put.bind(store)
      vi.spyOn(store, "put").mockImplementation((input) =>
        input.name === "shot.png" ? Promise.reject(new Error("put failed")) : original(input),
      )
      vi.spyOn(console, "error").mockImplementation(() => {})
      const before = await listIds()
      const res = await postImages(bodyWithImages, images())
      expect(res.status).toBe(500)
      expect(store.urls()).toEqual([])
      expect(await listIds()).toEqual(before)
    })
  })
})
