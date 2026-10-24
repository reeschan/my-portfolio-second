// @perspectives external-mock
// @routes /api/now
import { type Mock, afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { translateNowPost } from "@/lib/now/translate"

const fence = "```"
const source = {
  title: "図と画像を足した",
  body: [
    "## はじめに",
    "",
    "![構成図](diagram.png)",
    "",
    `${fence}mermaid`,
    "graph TD; A-->B",
    fence,
    "",
    `${fence}ts`,
    "const a = 1",
    fence,
    "",
    "![写真](photo.jpg)",
  ].join("\n"),
}

// source の本文と同じ構造の英訳
const goodBody = source.body.replace("## はじめに", "## Introduction").replace("![構成図]", "![Diagram]").replace("![写真]", "![Photo]")

function kimiResponse(content: string, finishReason = "stop") {
  return new Response(JSON.stringify({ choices: [{ message: { content }, finish_reason: finishReason }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}

// テストで差し替える環境変数 (NODE_ENV など、translateNowPost が読まない項目は省く)
const envOf = (vars: Record<string, string>) => vars as unknown as NodeJS.ProcessEnv

// 最後に送ったリクエストの URL・ヘッダー・本文
function sentRequest(fetchMock: Mock<typeof fetch>) {
  const call = fetchMock.mock.calls[0]
  if (!call) throw new Error("fetch was not called")
  const [url, init] = call
  const headers = init?.headers as Record<string, string>
  const body = JSON.parse(init?.body as string) as {
    model: string
    stream: boolean
    response_format: unknown
    messages: { role: string; content: string }[]
  }
  return { url, headers, body }
}

const translation = (title: string, body: string) => JSON.stringify({ title, body })

describe("translateNowPost", () => {
  const fetchMock = vi.fn<typeof fetch>()
  const env = envOf({ MOONSHOT_API_KEY: "test-key", MOONSHOT_BASE_URL: "https://moonshot.test/v1" })

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock)
    fetchMock.mockReset()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("Kimi の応答の題名と本文を返し、決まった形のリクエストを送る", async () => {
    fetchMock.mockResolvedValue(kimiResponse(translation("Added diagrams and images", goodBody)))

    const result = await translateNowPost(source, env)

    expect(result).toEqual({ ok: true, title: "Added diagrams and images", body: goodBody })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const sent = sentRequest(fetchMock)
    expect(sent.url).toBe("https://moonshot.test/v1/chat/completions")
    expect(sent.headers.Authorization).toBe("Bearer test-key")
    expect(sent.body.stream).toBe(false)
    expect(sent.body.response_format).toEqual({ type: "json_object" })
    const user = sent.body.messages.find((m) => m.role === "user")?.content
    expect(user).toContain(source.title)
    expect(user).toContain("はじめに")
  })

  it("基準の URL とモデルは未設定ならチャットと同じ既定値を使う", async () => {
    fetchMock.mockResolvedValue(kimiResponse(translation("T", goodBody)))
    await translateNowPost(source, envOf({ MOONSHOT_API_KEY: "k" }))
    const sent = sentRequest(fetchMock)
    expect(sent.url).toBe("https://api.moonshot.ai/v1/chat/completions")
    expect(sent.body.model).toBe("kimi-k2.6")
  })

  it("MOONSHOT_API_KEY が空なら fetch を呼ばずに not-configured を返す", async () => {
    const result = await translateNowPost(source, envOf({ MOONSHOT_API_KEY: "" }))
    expect(result).toEqual({ ok: false, reason: "not-configured" })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    ["画像の参照を落とした", goodBody.replace("![Photo](photo.jpg)", "")],
    [
      "画像の参照の順を変えた",
      goodBody.replace("diagram.png", "tmp.png").replace("photo.jpg", "diagram.png").replace("tmp.png", "photo.jpg"),
    ],
    ["mermaid の中身を変えた", goodBody.replace("graph TD; A-->B", "graph TD; A-->C")],
    ["コードブロックの言語を変えた", goodBody.replace(`${fence}ts`, `${fence}js`)],
    ["コードブロックを落とした", goodBody.replace(`${fence}ts\nconst a = 1\n${fence}`, "")],
    ["コードブロックを足した", `${goodBody}\n\n${fence}\nextra\n${fence}`],
  ])("訳が%sら failed を返す", async (_, body) => {
    fetchMock.mockResolvedValue(kimiResponse(translation("T", body)))
    const result = await translateNowPost(source, env)
    expect(result).toMatchObject({ ok: false, reason: "failed" })
  })

  it.each([
    ["題名が空", translation("  ", goodBody)],
    ["本文が空", translation("T", "")],
    ["題名が長すぎる", translation("a".repeat(121), goodBody)],
  ])("%sなら failed を返す", async (_, content) => {
    fetchMock.mockResolvedValue(kimiResponse(content))
    const result = await translateNowPost(source, env)
    expect(result).toMatchObject({ ok: false, reason: "failed" })
  })

  it("Kimi が 500 を返しても投げずに failed を返す", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 500 }))
    const result = await translateNowPost(source, env)
    expect(result).toMatchObject({ ok: false, reason: "failed" })
  })

  it("通信できなくても投げずに failed を返す", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"))
    const result = await translateNowPost(source, env)
    expect(result).toMatchObject({ ok: false, reason: "failed" })
  })

  it("応答の content が JSON でなければ failed を返す", async () => {
    fetchMock.mockResolvedValue(kimiResponse("Here is the translation: ..."))
    const result = await translateNowPost(source, env)
    expect(result).toMatchObject({ ok: false, reason: "failed" })
  })

  it("finish_reason が length (途中で切れた) なら failed を返す", async () => {
    fetchMock.mockResolvedValue(kimiResponse(translation("T", goodBody), "length"))
    const result = await translateNowPost(source, env)
    expect(result).toMatchObject({ ok: false, reason: "failed" })
  })
})
