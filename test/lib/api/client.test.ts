// @perspectives api-contract external-mock
// @routes /api/now /api/chat
import { afterEach, describe, expect, it, vi } from "vitest"
import { apiFetch, apiFetchJson } from "@/lib/api/client"
import { ApiError } from "@/lib/api/errors"

// 本物の外部 API は呼ばない。fetch をモックして、apiFetch の約束 (失敗は ApiError、上限時間) を確かめる
describe("apiFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  const stubFetch = (impl: typeof fetch) => {
    const mock = vi.fn<typeof fetch>(impl)
    vi.stubGlobal("fetch", mock)
    return mock
  }

  async function rejection(promise: Promise<unknown>): Promise<ApiError> {
    const error = await promise.then(
      () => null,
      (e: unknown) => e,
    )
    if (!(error instanceof ApiError)) throw new Error(`ApiError ではありません: ${String(error)}`)
    return error
  }

  it("成功したらレスポンスを返し、上限時間の signal を付けて呼ぶ", async () => {
    const mock = stubFetch(() => Promise.resolve(Response.json({ ok: true })))
    const res = await apiFetch("https://api.example/x", { service: "example", method: "POST" })

    expect(await res.json()).toEqual({ ok: true })
    expect(mock.mock.calls[0]?.[1]?.method).toBe("POST")
    expect(mock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal)
  })

  it("エラーのステータスなら ApiError を投げ、{ error } の文言を publicMessage に持つ", async () => {
    stubFetch(() => Promise.resolve(Response.json({ error: "リクエストが多すぎます。" }, { status: 429 })))
    const error = await rejection(apiFetch("/api/chat", { service: "chat" }))

    expect(error.status).toBe(429)
    expect(error.publicMessage).toBe("リクエストが多すぎます。")
    expect(error.message).toBe("chat request failed (status 429)")
  })

  it("JSON でないエラーなら publicMessage は null で、本文の先頭をログ用に持つ", async () => {
    stubFetch(() => Promise.resolve(new Response(`boom${"!".repeat(600)}`, { status: 500 })))
    const error = await rejection(apiFetch("https://api.example/x", { service: "example" }))
    expect(error).toMatchObject({ status: 500, publicMessage: null })
    expect(error.responseBody).toHaveLength(500)
    expect(error.responseBody?.startsWith("boom")).toBe(true)
  })

  it("通信できなければ status が null の ApiError を投げる", async () => {
    stubFetch(() => Promise.reject(new TypeError("fetch failed")))
    const error = await rejection(apiFetch("https://api.example/x", { service: "example" }))
    expect(error).toMatchObject({ status: null, message: "example request failed (network error)" })
  })

  it("上限時間を過ぎたら打ち切って timeout の ApiError を投げる", async () => {
    // signal が中断されるまで応答しない fetch
    stubFetch(
      (_input, init) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason as Error))
        }),
    )
    const error = await rejection(apiFetch("https://api.example/x", { service: "example", timeoutMs: 10 }))
    expect(error.message).toBe("example request failed (timeout)")
  })

  it("timeoutMs: false なら上限を付けず、呼び出し元の signal だけを渡す", async () => {
    const mock = stubFetch(() => Promise.resolve(new Response("ok")))
    const controller = new AbortController()
    await apiFetch("https://api.example/x", { service: "example", timeoutMs: false, signal: controller.signal })
    expect(mock.mock.calls[0]?.[1]?.signal).toBe(controller.signal)
  })

  it("apiFetchJson は本文の JSON を返す", async () => {
    stubFetch(() => Promise.resolve(Response.json({ result: 1 })))
    expect(await apiFetchJson("https://api.example/x", { service: "example" })).toEqual({ result: 1 })
  })
})
