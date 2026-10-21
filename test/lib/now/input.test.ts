// @perspectives api-contract
// @routes /api/now /api/now/[id]
import { describe, expect, it } from "vitest"
import { readNowPostInput, splitTitle } from "@/lib/now/input"

describe("readNowPostInput (画像の欄)", () => {
  it("JSON の入力は uploads が空", async () => {
    const request = new Request("http://localhost/api/now", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "t", body: "b" }),
    })
    expect(await readNowPostInput(request)).toEqual({ title: "t", body: "b", uploads: [] })
  })

  it("multipart の images を送った順に、ファイル名とバイト列で返す", async () => {
    const form = new FormData()
    form.append("file", new File(["# t\nb"], "post.md"))
    form.append("images", new File([Uint8Array.from([1, 2])], "a.png"))
    form.append("images", new File([Uint8Array.from([3])], "b.svg"))
    const input = await readNowPostInput(new Request("http://localhost/api/now", { method: "POST", body: form }))
    expect(input.uploads).toEqual([
      { name: "a.png", bytes: Uint8Array.from([1, 2]) },
      { name: "b.svg", bytes: Uint8Array.from([3]) },
    ])
  })

  it("images にテキストを送ったら 400", async () => {
    const form = new FormData()
    form.append("file", new File(["# t\nb"], "post.md"))
    form.append("images", "a.png")
    await expect(readNowPostInput(new Request("http://localhost/api/now", { method: "POST", body: form }))).rejects.toMatchObject({
      status: 400,
    })
  })
})

describe("splitTitle (Markdown のファイルから題名を決める)", () => {
  it("title 欄があればそれを使い、本文はファイルのまま", () => {
    expect(splitTitle("# 見出し\n\n本文", "指定の題名", "post.md")).toEqual({ title: "指定の題名", body: "# 見出し\n\n本文" })
  })

  it("title 欄がなければ先頭の # 見出しを題名にし、本文から外す", () => {
    expect(splitTitle("# AI 開発ナレッジ\n\n本文です", undefined, "post.md")).toEqual({ title: "AI 開発ナレッジ", body: "\n本文です" })
  })

  it("先頭の空行・BOM・CRLF・閉じの # があっても見出しを読める", () => {
    expect(splitTitle("﻿\n# 題名 #\r\n本文", undefined, "post.md")).toEqual({ title: "題名", body: "本文" })
  })

  it("先頭が # 見出しでなければ (## や本文)、ファイル名から拡張子を外して題名にする", () => {
    expect(splitTitle("## 小見出し\n\n本文", undefined, "2026-10-12-近況.md")).toEqual({
      title: "2026-10-12-近況",
      body: "## 小見出し\n\n本文",
    })
    expect(splitTitle("本文だけ", undefined, "note.MARKDOWN").title).toBe("note")
  })
})
