// @perspectives api-contract external-mock
// @routes /api/now /api/now/[id] /api/chat
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { escapeSlackText, isSlackNotifyConfigured, notifySlack, truncateForSlack } from "@/lib/slack/notify"

// 本物の Slack は呼ばない。fetch をモックする
const webhook = "https://hooks.slack.com/services/T000/B000/secret"

describe("notifySlack", () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.stubEnv("SLACK_WEBHOOK_URL", webhook)
    vi.stubGlobal("fetch", fetchMock)
    fetchMock.mockReset()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("Webhook に JSON で POST し、true を返す", async () => {
    fetchMock.mockResolvedValue(new Response("ok"))
    expect(await notifySlack({ text: "hello", blocks: [{ type: "divider" }] })).toBe(true)

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe(webhook)
    expect(init?.method).toBe("POST")
    expect(new Headers(init?.headers).get("Content-Type")).toBe("application/json")
    expect(JSON.parse(init?.body as string)).toEqual({ text: "hello", blocks: [{ type: "divider" }] })
  })

  it("文字列を渡したら text だけで送る", async () => {
    fetchMock.mockResolvedValue(new Response("ok"))
    await notifySlack("hello")
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toEqual({ text: "hello" })
  })

  it("未設定なら何もせず false を返す", async () => {
    vi.stubEnv("SLACK_WEBHOOK_URL", "")
    expect(isSlackNotifyConfigured()).toBe(false)
    expect(await notifySlack("hello")).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    ["エラーのステータス", () => Promise.resolve(new Response("invalid_payload", { status: 400 }))],
    ["通信できない", () => Promise.reject(new TypeError(`fetch failed: ${webhook}`))],
  ])("%s なら例外を投げずに false を返し、ログに Webhook の URL を出さない", async (_, impl) => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {})
    fetchMock.mockImplementation(impl)

    expect(await notifySlack("hello")).toBe(false)
    expect(errorLog).toHaveBeenCalled()
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("secret")
  })
})

describe("escapeSlackText", () => {
  it("メンションやリンクとして解釈されないよう & < > を実体参照にする", () => {
    expect(escapeSlackText("<!channel> a & b <https://x|y>")).toBe("&lt;!channel&gt; a &amp; b &lt;https://x|y&gt;")
  })
})

describe("truncateForSlack", () => {
  it("上限を超えたら切り詰めて … を付け、収まるならそのまま返す", () => {
    expect(truncateForSlack("あいうえお", 3)).toBe("あいう…")
    expect(truncateForSlack("あいう", 3)).toBe("あいう")
  })

  it("絵文字 (サロゲートペア) を途中で割らない", () => {
    expect(truncateForSlack("😀😀😀", 2)).toBe("😀😀…")
  })
})
