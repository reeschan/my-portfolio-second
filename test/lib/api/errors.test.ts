// @perspectives api-contract
// @routes /chat
import { describe, expect, it } from "vitest"
import { ApiError, HttpError, userMessageOf } from "@/lib/api/errors"

describe("userMessageOf", () => {
  it("自前の API が返した文言があればそれを使う", () => {
    expect(userMessageOf(new ApiError("chat", 503, "ご利用いただけません。"), "失敗しました。")).toBe("ご利用いただけません。")
  })

  it("文言がない ApiError やその他のエラーなら、呼び出し側の文言を使う", () => {
    expect(userMessageOf(new ApiError("chat", null, null), "失敗しました。")).toBe("失敗しました。")
    expect(userMessageOf(new TypeError("network"), "失敗しました。")).toBe("失敗しました。")
    expect(userMessageOf(new HttpError(500, "内部"), "失敗しました。")).toBe("失敗しました。")
  })
})
