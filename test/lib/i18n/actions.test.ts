// @perspectives interaction
// @routes /overview
import { beforeEach, describe, expect, it, vi } from "vitest"

const set = vi.fn()
vi.mock("next/headers", () => ({ cookies: () => Promise.resolve({ set }) }))

const { setLocale } = await import("@/lib/i18n/actions")

describe("setLocale", () => {
  beforeEach(() => set.mockClear())

  it("選んだ言語をサイト全体の Cookie に 1 年残す", async () => {
    await setLocale("en")
    expect(set).toHaveBeenCalledWith("locale", "en", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" })
  })

  it("知らない言語は書き込まない (クライアントから任意の値が届いても Cookie を汚さない)", async () => {
    await setLocale("fr")
    await setLocale(undefined)
    expect(set).not.toHaveBeenCalled()
  })
})
