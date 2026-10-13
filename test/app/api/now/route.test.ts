// @perspectives api-contract
// @routes /api/now
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "@/app/api/now/route"
import { getNowStore } from "@/lib/now/store"
import { formRequest, jsonRequest, paramsOf, useMemoryStoreEnv, useSlackMock } from "./helpers"

// after() はリクエストの外では使えないので、渡された処理を溜めておき、テストから実行する
const afterTasks = vi.hoisted(() => [] as (() => unknown)[])
vi.mock("next/server", () => ({ after: (task: () => unknown) => void afterTasks.push(task) }))
const runAfterTasks = () => Promise.all(afterTasks.splice(0).map((task) => task()))

const post = (body: unknown, auth?: string | null) => POST(jsonRequest("POST", "/api/now", body, auth), paramsOf({}))
const listIds = async () => (await getNowStore()!.list()).map((p) => p.id)

describe("POST /api/now", () => {
  beforeEach(useMemoryStoreEnv)
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.useRealTimers()
    afterTasks.length = 0
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

  describe("multipart/form-data で Markdown のファイルを送る (Postman 向け)", () => {
    const postForm = (fields: Record<string, string | File>) => POST(formRequest("POST", "/api/now", fields), paramsOf({}))
    const mdFile = (text: string, name = "post.md") => new File([text], name, { type: "text/markdown" })

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
})
