// @perspectives api-contract
// @routes /api/now /api/now/[id] /api/chat
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { withErrorHandling } from "@/decorator/with-error-handling"
import { ApiError, HttpError } from "@/lib/api/errors"

const request = new Request("http://localhost/api/x", { method: "POST" })
const ctx = { params: Promise.resolve({}) }
const throwing = (error: unknown) => () => {
  throw error
}

describe("withErrorHandling", () => {
  const consoleError = vi.fn()
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(consoleError)
    consoleError.mockClear()
  })
  afterEach(() => vi.restoreAllMocks())

  it("エラーがなければ包んだ処理のレスポンスをそのまま返す", async () => {
    const res = await withErrorHandling(() => Response.json({ ok: true }, { status: 201 }))(request, ctx)
    expect(res.status).toBe(201)
  })

  it("HttpError はそのステータス・文言・詳細・ヘッダーで返し、ログに出さない", async () => {
    const error = new HttpError(401, "認証に失敗しました。", { details: { hint: "x" }, headers: { "WWW-Authenticate": "Bearer" } })
    const res = await withErrorHandling(throwing(error))(request, ctx)

    expect(res.status).toBe(401)
    expect(res.headers.get("WWW-Authenticate")).toBe("Bearer")
    expect(await res.json()).toEqual({ error: "認証に失敗しました。", hint: "x" })
    expect(consoleError).not.toHaveBeenCalled()
  })

  it("async の処理が投げた HttpError も受け取る", async () => {
    const res = await withErrorHandling(() => Promise.reject(new HttpError(404, "ない")))(request, ctx)
    expect(res.status).toBe(404)
  })

  it("ApiError は 502 と上位が決めた文言で返し、呼んだ先の文言は見せずにログに残す", async () => {
    const error = new ApiError("Upstash HSET", 500, "内部の文言")
    const res = await withErrorHandling(throwing(error), { upstream: "保存に失敗しました。" })(request, ctx)

    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: "保存に失敗しました。" })
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining("POST /api/x"), expect.anything())
  })

  it("想定していないエラーは 500 と決まった文言で返し、ログに残す", async () => {
    const res = await withErrorHandling(throwing(new TypeError("bug")), { unexpected: "エラーです。" })(request, ctx)

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: "エラーです。" })
    expect(consoleError).toHaveBeenCalled()
  })

  it("文言を渡さなければ既定の文言を使う", async () => {
    const res = await withErrorHandling(throwing(new ApiError("x", 500, null)))(request, ctx)
    expect(((await res.json()) as { error: string }).error).toContain("外部のサービス")
  })
})
