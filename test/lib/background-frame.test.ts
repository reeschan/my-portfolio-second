// @coverage-map ignore 全ページの背景の描画で使う判定で、特定のルートに紐づかない
import { describe, expect, it } from "vitest"
import { BACKGROUND_FPS, isSoftwareRenderer, loopTime, lowerBackgroundDpr, nextFrameTime } from "@/lib/background-frame"

const interval = 1000 / BACKGROUND_FPS

describe("lowerBackgroundDpr", () => {
  it("上限 (1.75) からは 1 に下げる", () => {
    expect(lowerBackgroundDpr(1.75)).toBe(1)
  })

  it("1 からは 0.5 に下げる", () => {
    expect(lowerBackgroundDpr(1)).toBe(0.5)
  })

  it("既に最小 (0.5) なら最小のまま", () => {
    expect(lowerBackgroundDpr(0.5)).toBe(0.5)
  })

  it("段の間の値 (1.2) なら、その値より小さい最大の段 (1) に下げる", () => {
    expect(lowerBackgroundDpr(1.2)).toBe(1)
  })

  it("最小より下 (0.3) なら最小 (0.5) にする", () => {
    expect(lowerBackgroundDpr(0.3)).toBe(0.5)
  })
})

describe("isSoftwareRenderer", () => {
  it.each([
    "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)",
    "llvmpipe (LLVM 15.0.7, 256 bits)",
    "Microsoft Basic Render Driver",
  ])("ソフトウェア描画の名前なら true (%s)", (renderer) => {
    expect(isSoftwareRenderer(renderer)).toBe(true)
  })

  it.each(["ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)", "Apple M2", "WebKit WebGL"])(
    "GPU の名前なら false (%s)",
    (renderer) => {
      expect(isSoftwareRenderer(renderer)).toBe(false)
    },
  )

  it("大文字小文字を区別しない", () => {
    expect(isSoftwareRenderer("SWIFTSHADER")).toBe(true)
    expect(isSoftwareRenderer("Microsoft Basic Render Driver".toUpperCase())).toBe(true)
  })

  it("空文字・null・undefined は false", () => {
    expect(isSoftwareRenderer("")).toBe(false)
    expect(isSoftwareRenderer(null)).toBe(false)
    expect(isSoftwareRenderer(undefined)).toBe(false)
  })
})

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

describe("loopTime", () => {
  const loopSeconds = 10

  it("0 秒なら 0 を返す", () => {
    expect(loopTime(0, loopSeconds)).toBe(0)
  })

  it("ループの長さちょうどなら 0 を返す", () => {
    expect(loopTime(loopSeconds, loopSeconds)).toBe(0)
  })

  it("長さの 2.5 倍なら長さの半分を返す", () => {
    expect(loopTime(loopSeconds * 2.5, loopSeconds)).toBe(loopSeconds / 2)
  })

  it("長さより少し前なら、その値のまま返す", () => {
    expect(loopTime(loopSeconds - 0.5, loopSeconds)).toBe(loopSeconds - 0.5)
  })

  it("ループの長さが 0 以下なら 0 を返す", () => {
    expect(loopTime(3, 0)).toBe(0)
    expect(loopTime(3, -1)).toBe(0)
  })
})
