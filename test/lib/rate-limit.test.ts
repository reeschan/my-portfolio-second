// @perspectives api-contract
// @routes /api/chat /api/contact
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createRateLimiter } from "@/lib/rate-limit"

describe("createRateLimiter", () => {
  let isRateLimited: (key: string) => boolean

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-10-01T00:00:00Z"))
    isRateLimited = createRateLimiter({ windowMs: 10 * 60 * 1000, maxRequests: 20 })
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

  it("枠ごとに別々に数える", () => {
    const otherRateLimited = createRateLimiter({ windowMs: 10 * 60 * 1000, maxRequests: 20 })
    const key = "203.0.113.5"
    for (let i = 0; i < 20; i++) expect(isRateLimited(key)).toBe(false)
    expect(isRateLimited(key)).toBe(true)
    expect(otherRateLimited(key)).toBe(false)
  })

  it("枠ごとの時間の幅と上限が効く", () => {
    const isContactRateLimited = createRateLimiter({ windowMs: 60 * 60 * 1000, maxRequests: 5 })
    const key = "203.0.113.6"
    for (let i = 0; i < 5; i++) expect(isContactRateLimited(key)).toBe(false)
    expect(isContactRateLimited(key)).toBe(true)

    vi.advanceTimersByTime(60 * 60 * 1000 - 1)
    expect(isContactRateLimited(key)).toBe(true)
    vi.advanceTimersByTime(1)
    expect(isContactRateLimited(key)).toBe(false)
  })
})
