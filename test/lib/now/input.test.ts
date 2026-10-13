// @perspectives api-contract
// @routes /api/now /api/now/[id]
import { describe, expect, it } from "vitest"
import { splitTitle } from "@/lib/now/input"

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
