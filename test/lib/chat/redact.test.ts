// @perspectives privacy
// @routes /api/chat
import { describe, expect, it } from "vitest"
import { createRedactingStream, redact } from "@/lib/chat/redact"

async function runThroughStream(chunks: string[]) {
  const stream = new ReadableStream<string>({
    start(controller) {
      for (const c of chunks) controller.enqueue(c)
      controller.close()
    },
  }).pipeThrough(createRedactingStream())

  let out = ""
  const reader = stream.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    out += value
  }
  return out
}

describe("redact", () => {
  it.each([
    ["メールアドレス", "連絡は taro.yamada+dev@example.co.jp まで", "連絡は ［非公開］ まで"],
    ["携帯番号", "電話は 090-1234-5678 です", "電話は ［非公開］ です"],
    ["国際表記の番号", "+81 3 1234 5678 へ", "［非公開］ へ"],
    ["郵便番号", "〒123-4567 東京都", "［非公開］ 東京都"],
  ])("%s を伏せ字にする", (_, input, expected) => {
    expect(redact(input)).toBe(expected)
  })

  it("連絡先を含まない文はそのまま返す", () => {
    const text = "AWS 認定は 2024 年に 10 冠を達成しました。"
    expect(redact(text)).toBe(text)
  })
})

describe("createRedactingStream", () => {
  it("チャンクの境目で分断されたメールアドレスも伏せ字にする", async () => {
    const filler = "これは前置きの文章です。".repeat(10)
    const out = await runThroughStream([`${filler}連絡先は taro.ya`, "mada@example.com です。", "以上です。"])

    expect(out).not.toContain("example.com")
    expect(out).toContain("［非公開］")
    expect(out.endsWith("以上です。")).toBe(true)
  })

  it("短い回答も flush 時に全文を返す", async () => {
    expect(await runThroughStream(["はい。"])).toBe("はい。")
  })
})
