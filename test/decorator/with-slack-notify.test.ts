// @perspectives api-contract external-mock
// @routes /api/now /api/now/[id] /api/chat
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { withSlackNotify } from "@/decorator/with-slack-notify"
import { HttpError } from "@/lib/api/errors"

// after() はリクエストの外では使えないので、渡された処理を溜めておき、テストから実行する
const afterTasks = vi.hoisted(() => [] as (() => unknown)[])
vi.mock("next/server", () => ({ after: (task: () => unknown) => void afterTasks.push(task) }))
const runAfterTasks = () => Promise.all(afterTasks.splice(0).map((task) => task()))

const webhook = "https://hooks.slack.com/services/T000/B000/secret"
const request = () => new Request("http://localhost/api/x", { method: "POST", body: JSON.stringify({ title: "題名" }) })
const ctx = { params: Promise.resolve({}) }
const sentBodies = (fetchMock: ReturnType<typeof vi.fn<typeof fetch>>) =>
  fetchMock.mock.calls.map(([, init]) => JSON.parse(init?.body as string) as unknown)

describe("withSlackNotify", () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.stubEnv("SLACK_WEBHOOK_URL", webhook)
    vi.stubGlobal("fetch", fetchMock)
    fetchMock.mockReset()
    fetchMock.mockResolvedValue(new Response("ok"))
    afterTasks.length = 0
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("成功したら、レスポンスを返したあと (after) に組み立てた中身を送る", async () => {
    const handler = vi.fn(async (req: Request) => Response.json(await req.json(), { status: 201 }))
    const wrapped = withSlackNotify(async ({ request: req, response }) => {
      const sent = (await req.json()) as { title: string }
      const returned = (await response.clone().json()) as { title: string }
      return `${sent.title} / ${returned.title} / ${response.status}`
    }, handler)

    const res = await wrapped(request(), ctx)
    // 包んだ処理も本文を読め、利用者には元のレスポンスがそのまま返る
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ title: "題名" })
    expect(fetchMock).not.toHaveBeenCalled()

    await runAfterTasks()
    expect(sentBodies(fetchMock)).toEqual([{ text: "題名 / 題名 / 201" }])
  })

  it("2xx 以外を返したら通知しない", async () => {
    const build = vi.fn(() => "x")
    const res = await withSlackNotify(build, () => new Response(null, { status: 404 }))(request(), ctx)
    expect(res.status).toBe(404)
    expect(build).not.toHaveBeenCalled()
    expect(afterTasks).toHaveLength(0)
  })

  it("包んだ処理が投げたら、そのまま投げて通知しない (レスポンスにするのは外側の withErrorHandling)", async () => {
    const build = vi.fn(() => "x")
    const wrapped = withSlackNotify(build, () => {
      throw new HttpError(401, "認証に失敗しました。")
    })
    await expect(wrapped(request(), ctx)).rejects.toBeInstanceOf(HttpError)
    expect(build).not.toHaveBeenCalled()
    expect(afterTasks).toHaveLength(0)
  })

  it("組み立てが null を返したら通知しない", async () => {
    await withSlackNotify(
      () => null,
      () => Response.json({}),
    )(request(), ctx)
    expect(afterTasks).toHaveLength(0)
  })

  it("組み立てに失敗しても、レスポンスは変えずに通知だけ見送る", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const wrapped = withSlackNotify(
      () => {
        throw new Error("boom")
      },
      () => Response.json({ ok: true }),
    )
    const res = await wrapped(request(), ctx)
    expect(await res.json()).toEqual({ ok: true })
    expect(afterTasks).toHaveLength(0)
  })

  it("Slack への送信に失敗しても、例外を投げない", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    fetchMock.mockResolvedValue(new Response("no_service", { status: 404 }))
    await withSlackNotify(
      () => "x",
      () => Response.json({}),
    )(request(), ctx)
    await expect(runAfterTasks()).resolves.toBeDefined()
  })

  it("SLACK_WEBHOOK_URL が未設定なら、包んだ処理を呼ぶだけで組み立てもしない", async () => {
    vi.stubEnv("SLACK_WEBHOOK_URL", "")
    const build = vi.fn(() => "x")
    const res = await withSlackNotify(build, () => Response.json({ ok: true }))(request(), ctx)
    expect(res.status).toBe(200)
    expect(build).not.toHaveBeenCalled()
    expect(afterTasks).toHaveLength(0)
  })
})
