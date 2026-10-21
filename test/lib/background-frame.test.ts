// @coverage-map ignore 全ページの背景の描画で使う判定で、特定のルートに紐づかない
import { describe, expect, it } from "vitest"
import { BACKGROUND_FPS, nextFrameTime } from "@/lib/background-frame"

const interval = 1000 / BACKGROUND_FPS

describe("nextFrameTime", () => {
  it("初回 (last が null) はその時刻で描く", () => {
    expect(nextFrameTime(123, null, interval)).toBe(123)
  })

  it("前に描いてから間隔に満たなければ描かない", () => {
    expect(nextFrameTime(16, 0, interval)).toBeNull()
  })

  it("ちょうど間隔が経ったら、その時刻で描く", () => {
    expect(nextFrameTime(interval, 0, interval)).toBe(interval)
  })

  it("間隔を超えたら端数を持ち越した時刻を返す", () => {
    const result = nextFrameTime(50, 0, interval)
    expect(result).toBeCloseTo(50 - (50 % interval))
    expect(result).toBeCloseTo(interval)
  })
})
