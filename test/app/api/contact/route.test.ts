// @perspectives api-contract external-mock
// @routes /api/contact
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { POST as handler } from "@/app/api/contact/route"

// Route Handler は第 2 引数 (context) を受け取る形なので、空の params を渡す
const POST = (request: Request) => handler(request, { params: Promise.resolve({}) })

// 本物の Slack は呼ばない (testing/e2e-policy.yml の external-mock 観点)。fetch をモックする
const webhook = "https://hooks.slack.test/xxx"
const failedMessage = "送信に失敗しました。時間をおいてもう一度お試しください。"

// レート制限の状態はモジュールのメモリに残るので、テストごとに IP を変える
let ipSeq = 0
function contactRequest(body: unknown, ip = `198.51.100.${++ipSeq}`) {
  return new Request("http://localhost/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  })
}

const validInput = {
  name: "山田 太郎",
  email: "sender@example.com",
  message: "お仕事のご相談です。来月からの案件についてお話しできますか。",
}

type SentSection = { type: string; text?: { type: string; text: string } }
type SentMessage = { text: string; blocks?: SentSection[] }

describe("POST /api/contact", () => {
  const fetchMock = vi.fn<typeof fetch>()
  const slackCalls = () => fetchMock.mock.calls.filter(([url]) => url === webhook)
  const slackBodies = () => slackCalls().map(([, init]) => JSON.parse(init?.body as string) as SentMessage)

  beforeEach(() => {
    vi.stubEnv("SLACK_WEBHOOK_URL", webhook)
    vi.stubGlobal("fetch", fetchMock)
    fetchMock.mockReset()
    fetchMock.mockImplementation(() => Promise.resolve(new Response("ok")))
    vi.spyOn(console, "error").mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("正しい入力なら 200 と { received: true } を返し、Slack に名前・メールアドレス・本文を 1 回送り、IP は送らない", async () => {
    const res = await POST(contactRequest(validInput, "203.0.113.77"))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ received: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(slackCalls()).toHaveLength(1)
    const sent = JSON.stringify(slackBodies())
    expect(sent).toContain(validInput.name)
    expect(sent).toContain(validInput.email)
    expect(sent).toContain(validInput.message)
    expect(sent).not.toContain("203.0.113.77")
  })

  it("名前・本文に書かれた <!channel> やリンクの書式は無害化して送る", async () => {
    const res = await POST(
      contactRequest({
        ...validInput,
        name: "<!channel> 太郎",
        message: "<!channel> こちらを見てください <https://evil.example|click>",
      }),
    )

    expect(res.status).toBe(200)
    const sent = JSON.stringify(slackBodies())
    expect(sent).toContain("&lt;!channel&gt;")
    expect(sent).toContain("&lt;https://evil.example|click&gt;")
    expect(sent).not.toContain("<!channel>")
    expect(sent).not.toContain("<https://evil.example|click>")
  })

  it("無害化で本文が長くなっても、どの section の text も 3000 字以下に分けて全文を送る", async () => {
    const res = await POST(contactRequest({ ...validInput, message: "&".repeat(2000) }))

    expect(res.status).toBe(200)
    const [sent] = slackBodies()
    const texts = (sent?.blocks ?? []).flatMap((block) => (block.type === "section" && block.text ? [block.text.text] : []))
    expect(texts.length).toBeGreaterThan(0)
    for (const text of texts) expect(text.length).toBeLessThanOrEqual(3000)
    // 切り詰めずに全文が載っている
    expect(texts.join("").split("&amp;").length - 1).toBe(2000)
  })

  it.each([
    ["名前が空", { ...validInput, name: "   " }],
    ["メールアドレスの形が違う", { ...validInput, email: "not-an-email" }],
    ["本文が 9 字", { ...validInput, message: "あ".repeat(9) }],
    ["本文が 2001 字", { ...validInput, message: "あ".repeat(2001) }],
    ["JSON でない", "not json"],
  ])("%s場合は 400 を返し、Slack に送らない", async (_, body) => {
    const res = await POST(contactRequest(body))
    expect(res.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("ハニーポット (website) が埋まっていたら、Slack に送らずに 200 と { received: true } を返す", async () => {
    const res = await POST(contactRequest({ ...validInput, website: "https://spam.example" }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ received: true })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("同じ IP からは 5 回まで 200、6 回目は 429。別の IP は 200", async () => {
    const ip = "198.51.100.250"
    for (let i = 0; i < 5; i++) expect((await POST(contactRequest(validInput, ip))).status).toBe(200)
    expect((await POST(contactRequest(validInput, ip))).status).toBe(429)
    expect((await POST(contactRequest(validInput, "198.51.100.251"))).status).toBe(200)
  })

  it.each([
    ["Webhook が 500 を返す", () => Promise.resolve(new Response("boom", { status: 500 }))],
    ["fetch が reject する", () => Promise.reject(new TypeError("network down"))],
  ])("%s と 502 と送信失敗の文言を返す", async (_, impl) => {
    fetchMock.mockImplementation(impl)
    const res = await POST(contactRequest(validInput))
    expect(res.status).toBe(502)
    expect(((await res.json()) as { error: string }).error).toBe(failedMessage)
  })

  it("SLACK_WEBHOOK_URL が空なら 503 を返し、Slack に送らない", async () => {
    vi.stubEnv("SLACK_WEBHOOK_URL", "")
    const res = await POST(contactRequest(validInput))
    expect(res.status).toBe(503)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
