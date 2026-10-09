// @perspectives api-contract external-mock privacy
// @routes /api/chat
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { POST as handler } from "@/app/api/chat/route"

// after() はリクエストの外では使えないので、渡された処理を溜めておき、テストから実行する
const afterTasks = vi.hoisted(() => [] as (() => unknown)[])
vi.mock("next/server", () => ({ after: (task: () => unknown) => void afterTasks.push(task) }))
const runAfterTasks = () => Promise.all(afterTasks.splice(0).map((task) => task()))

// Route Handler は第 2 引数 (context) を受け取る形なので、空の params を渡す
const POST = (request: Request) => handler(request, { params: Promise.resolve({}) })

// 本物の Moonshot API は呼ばない (testing/e2e-policy.yml の external-mock 観点)
let ipSeq = 0
function chatRequest(body: unknown, ip = `198.51.100.${++ipSeq}`) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  })
}

function sseResponse(events: object[]) {
  const body = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("") + "data: [DONE]\n\n"
  return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } })
}

const userMessage = { messages: [{ role: "user", content: "得意な技術は？" }] }

describe("POST /api/chat", () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.stubEnv("MOONSHOT_API_KEY", "test-key")
    vi.stubEnv("SLACK_WEBHOOK_URL", "")
    vi.stubGlobal("fetch", fetchMock)
    fetchMock.mockReset()
    vi.spyOn(console, "error").mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("API キー未設定なら 503 を返し、上流を呼ばない", async () => {
    vi.stubEnv("MOONSHOT_API_KEY", "")
    const res = await POST(chatRequest(userMessage))
    expect(res.status).toBe(503)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    ["JSON でない", "not json"],
    ["messages が空", { messages: [] }],
    ["role が不正", { messages: [{ role: "system", content: "x" }] }],
    [
      "最後が assistant",
      {
        messages: [
          { role: "user", content: "a" },
          { role: "assistant", content: "b" },
        ],
      },
    ],
    ["user の入力が 1000 字超", { messages: [{ role: "user", content: "あ".repeat(1001) }] }],
  ])("%s場合は 400 を返す", async (_, body) => {
    const res = await POST(chatRequest(body))
    expect(res.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("同じ IP から 21 回目のリクエストは 429 を返す", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(sseResponse([{ choices: [{ delta: { content: "ok" } }] }])))
    const ip = "198.51.100.250"
    for (let i = 0; i < 20; i++) await POST(chatRequest(userMessage, ip))
    const res = await POST(chatRequest(userMessage, ip))
    expect(res.status).toBe(429)
  })

  it("回答本文だけをストリームで返し、思考過程は返さず、連絡先は伏せ字にする", async () => {
    fetchMock.mockResolvedValue(
      sseResponse([
        { choices: [{ delta: { reasoning_content: "内部の思考メモ" } }] },
        { choices: [{ delta: { content: "React と AWS が得意です。" } }] },
        { choices: [{ delta: { content: "連絡は me@example.com へ。" } }] },
      ]),
    )

    const res = await POST(chatRequest(userMessage))
    expect(res.status).toBe(200)
    const text = await res.text()

    expect(text).toContain("React と AWS が得意です。")
    expect(text).not.toContain("内部の思考メモ")
    expect(text).not.toContain("me@example.com")
    expect(text).toContain("［非公開］")
  })

  it("上流にシステムプロンプトを先頭に付けて送り、assistant の長い履歴は 4000 字に切り詰める", async () => {
    fetchMock.mockResolvedValue(sseResponse([{ choices: [{ delta: { content: "ok" } }] }]))

    await POST(
      chatRequest({
        messages: [
          { role: "user", content: "q1" },
          { role: "assistant", content: "長".repeat(5000) },
          { role: "user", content: "q2" },
        ],
      }),
    )

    const [, init] = fetchMock.mock.calls[0] ?? []
    // route.ts は body を JSON 文字列で送る
    const sent = JSON.parse(init?.body as string) as { messages: { role: string; content: string }[] }
    expect(sent.messages[0]?.role).toBe("system")
    expect(sent.messages[2]?.content).toHaveLength(4000)
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer test-key")
  })

  it("max_tokens で打ち切られたら区切った旨を付け足す", async () => {
    fetchMock.mockResolvedValue(sseResponse([{ choices: [{ delta: { content: "途中まで" }, finish_reason: "length" }] }]))
    const text = await (await POST(chatRequest(userMessage))).text()
    expect(text).toContain("ここで区切りました")
  })

  it("上流がエラーなら 502 を返す", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 500 }))
    const res = await POST(chatRequest(userMessage))
    expect(res.status).toBe(502)
  })

  describe("Slack への通知", () => {
    const webhook = "https://hooks.slack.com/services/T000/B000/secret"
    const slackBodies = () =>
      fetchMock.mock.calls.filter(([url]) => url === webhook).map(([, init]) => JSON.parse(init?.body as string) as { text: string })

    beforeEach(() => {
      vi.stubEnv("SLACK_WEBHOOK_URL", webhook)
      afterTasks.length = 0
    })

    it("回答を返したら、最新の質問だけを Slack に送る (回答・IP は送らない)", async () => {
      fetchMock.mockImplementation((url) =>
        Promise.resolve(url === webhook ? new Response("ok") : sseResponse([{ choices: [{ delta: { content: "React です。" } }] }])),
      )
      const res = await POST(
        chatRequest(
          {
            messages: [
              { role: "user", content: "前の質問" },
              { role: "assistant", content: "前の回答" },
              { role: "user", content: "得意な技術は？" },
            ],
          },
          "203.0.113.9",
        ),
      )
      expect(await res.text()).toContain("React です。")
      await runAfterTasks()

      const sent = JSON.stringify(slackBodies())
      expect(slackBodies()).toHaveLength(1)
      expect(sent).toContain("得意な技術は？")
      expect(sent).not.toContain("前の質問")
      expect(sent).not.toContain("React です。")
      expect(sent).not.toContain("203.0.113.9")
    })

    it("上流が失敗した・入力が不正なら送らない", async () => {
      fetchMock.mockResolvedValue(new Response("boom", { status: 500 }))
      expect((await POST(chatRequest(userMessage))).status).toBe(502)
      expect((await POST(chatRequest({ messages: [] }))).status).toBe(400)
      await runAfterTasks()
      expect(slackBodies()).toEqual([])
    })
  })
})
