// @perspectives api-contract
// @routes /api/chat
import { describe, expect, it } from "vitest"
import { chatRequestSchema, sseChunkSchema } from "@/lib/chat/schema"

describe("chatRequestSchema", () => {
  it("直近 20 件だけを残し、古い発言の形は問わない", () => {
    const old = { role: "system", content: "" }
    const recent = Array.from({ length: 20 }, (_, i) => ({ role: i % 2 === 0 ? "assistant" : "user", content: `m${i}` }))
    const r = chatRequestSchema.safeParse({ messages: [old, ...recent] })
    expect(r.success).toBe(true)
    expect(r.data).toHaveLength(20)
  })

  it("AI の過去の回答は 4000 字に切り詰める", () => {
    const r = chatRequestSchema.safeParse({
      messages: [
        { role: "assistant", content: "長".repeat(5000) },
        { role: "user", content: "q" },
      ],
    })
    expect(r.data?.[0]?.content).toHaveLength(4000)
  })

  it.each([
    ["null", null],
    ["messages が配列でない", { messages: "x" }],
    ["content が空", { messages: [{ role: "user", content: "" }] }],
  ])("%s は弾く", (_, body) => {
    expect(chatRequestSchema.safeParse(body).success).toBe(false)
  })
})

describe("sseChunkSchema", () => {
  it("本文と終了理由を読み、知らない項目は無視する", () => {
    const r = sseChunkSchema.safeParse({
      id: "x",
      choices: [{ delta: { content: "やあ", reasoning_content: "考え" }, finish_reason: null }],
    })
    expect(r.data?.choices?.[0]?.delta?.content).toBe("やあ")
  })

  it("choices の形が違えば失敗する", () => {
    expect(sseChunkSchema.safeParse({ choices: [{ delta: { content: 1 } }] }).success).toBe(false)
  })
})
