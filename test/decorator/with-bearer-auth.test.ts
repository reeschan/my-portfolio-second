// @perspectives api-contract
// @routes /api/now /api/now/[id]
import { afterEach, describe, expect, it, vi } from "vitest"
import { authorizeBearer, withBearerAuth } from "@/decorator/with-bearer-auth"
import { HttpError } from "@/lib/api/errors"

const withAuth = (value?: string) =>
  new Request("http://localhost/api/x", { method: "POST", headers: value ? { Authorization: value } : {} })

describe("authorizeBearer", () => {
  it("Bearer のトークンが一致すれば通す (Bearer の大小文字は問わない)", () => {
    expect(authorizeBearer(withAuth("Bearer secret"), "secret")).toBe("ok")
    expect(authorizeBearer(withAuth("bearer secret"), "secret")).toBe("ok")
  })

  it("トークンが違う・ない・形式が違うなら弾く", () => {
    expect(authorizeBearer(withAuth("Bearer wrong"), "secret")).toBe("unauthorized")
    expect(authorizeBearer(withAuth(), "secret")).toBe("unauthorized")
    expect(authorizeBearer(withAuth("Basic secret"), "secret")).toBe("unauthorized")
    expect(authorizeBearer(withAuth("Bearer "), "secret")).toBe("unauthorized")
  })

  it("サーバーにトークンが未設定なら、空のヘッダーとも一致させない", () => {
    expect(authorizeBearer(withAuth("Bearer "), "")).toBe("unconfigured")
    expect(authorizeBearer(withAuth(), undefined)).toBe("unconfigured")
  })
})

describe("withBearerAuth", () => {
  afterEach(() => vi.unstubAllEnvs())

  const options = { tokenEnv: "TEST_API_TOKEN", realm: "test" }
  const setup = () => {
    const handler = vi.fn<(req: Request, ctx: { params: Promise<{ id: string }> }) => Response>(() => Response.json({ ok: true }))
    return { handler, wrapped: withBearerAuth(options, handler) }
  }
  const ctx = { params: Promise.resolve({ id: "1" }) }

  // 弾くときは HttpError を投げる (レスポンスにするのは外側の withErrorHandling)
  function thrownBy(fn: () => unknown): HttpError {
    try {
      fn()
    } catch (error) {
      if (error instanceof HttpError) return error
      throw error
    }
    throw new Error("HttpError が投げられませんでした")
  }

  it("通ったら包んだ処理にリクエストと context をそのまま渡し、その結果を返す", async () => {
    vi.stubEnv("TEST_API_TOKEN", "secret")
    const { handler, wrapped } = setup()
    const req = withAuth("Bearer secret")

    const res = await wrapped(req, ctx)
    expect(res.status).toBe(200)
    expect(handler).toHaveBeenCalledWith(req, ctx)
  })

  it("弾いたら 401 の HttpError (WWW-Authenticate 付き) を投げ、包んだ処理を呼ばない", () => {
    vi.stubEnv("TEST_API_TOKEN", "secret")
    const { handler, wrapped } = setup()

    const error = thrownBy(() => wrapped(withAuth("Bearer wrong"), ctx))
    expect(error.status).toBe(401)
    expect(error.options.headers).toEqual({ "WWW-Authenticate": 'Bearer realm="test"' })
    expect(handler).not.toHaveBeenCalled()
  })

  it("トークンが未設定なら 503 の HttpError を投げ、包んだ処理を呼ばない", () => {
    vi.stubEnv("TEST_API_TOKEN", "")
    const { handler, wrapped } = setup()

    expect(thrownBy(() => wrapped(withAuth("Bearer "), ctx)).status).toBe(503)
    expect(handler).not.toHaveBeenCalled()
  })

  it("トークンはリクエストのたびに環境変数から読む", async () => {
    const { wrapped } = setup()
    vi.stubEnv("TEST_API_TOKEN", "old")
    expect(thrownBy(() => wrapped(withAuth("Bearer new"), ctx)).status).toBe(401)
    vi.stubEnv("TEST_API_TOKEN", "new")
    expect((await wrapped(withAuth("Bearer new"), ctx)).status).toBe(200)
  })
})
