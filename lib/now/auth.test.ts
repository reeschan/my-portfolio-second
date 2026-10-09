// @perspectives api-contract
// @routes /api/now
import { describe, expect, it } from "vitest"
import { authorizeNowPost } from "./auth"

const withAuth = (value?: string) =>
  new Request("http://localhost/api/now", { method: "POST", headers: value ? { Authorization: value } : {} })

describe("authorizeNowPost", () => {
  it("Bearer のトークンが一致すれば通す (Bearer の大小文字は問わない)", () => {
    expect(authorizeNowPost(withAuth("Bearer secret"), "secret")).toBe("ok")
    expect(authorizeNowPost(withAuth("bearer secret"), "secret")).toBe("ok")
  })

  it("トークンが違う・ない・形式が違うなら弾く", () => {
    expect(authorizeNowPost(withAuth("Bearer wrong"), "secret")).toBe("unauthorized")
    expect(authorizeNowPost(withAuth(), "secret")).toBe("unauthorized")
    expect(authorizeNowPost(withAuth("Basic secret"), "secret")).toBe("unauthorized")
    expect(authorizeNowPost(withAuth("Bearer "), "secret")).toBe("unauthorized")
  })

  it("サーバーにトークンが未設定なら、空のヘッダーとも一致させない", () => {
    expect(authorizeNowPost(withAuth("Bearer "), "")).toBe("unconfigured")
    expect(authorizeNowPost(withAuth(), undefined)).toBe("unconfigured")
  })
})
