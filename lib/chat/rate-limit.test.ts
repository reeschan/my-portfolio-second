// @perspectives api-contract
// @routes /api/chat
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { isRateLimited } from "./rate-limit"

describe("isRateLimited", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-10-01T00:00:00Z"))
  })
  afterEach(() => vi.useRealTimers())

  it("10 分間に 20 回までは通し、21 回目で制限する", () => {
    const key = "203.0.113.1"
    for (let i = 0; i < 20; i++) expect(isRateLimited(key)).toBe(false)
    expect(isRateLimited(key)).toBe(true)
  })

  it("10 分経つと再び通す", () => {
    const key = "203.0.113.2"
    for (let i = 0; i < 20; i++) isRateLimited(key)
    expect(isRateLimited(key)).toBe(true)

    vi.advanceTimersByTime(10 * 60 * 1000)
    expect(isRateLimited(key)).toBe(false)
  })

  it("IP ごとに独立して数える", () => {
    for (let i = 0; i < 20; i++) isRateLimited("203.0.113.3")
    expect(isRateLimited("203.0.113.3")).toBe(true)
    expect(isRateLimited("203.0.113.4")).toBe(false)
  })
})
