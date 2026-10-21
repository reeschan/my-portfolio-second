// @perspectives content
// @routes /now
import { describe, expect, it } from "vitest"
import { excerptOf } from "@/lib/now/excerpt"

describe("excerptOf", () => {
  it("Markdown の記号を落として平文にする", () => {
    const md = "# 見出し\n\n- **太字** と `コード`\n- [リンク](https://example.com)\n\n> 引用"
    expect(excerptOf(md)).toBe("見出し 太字 と コード リンク 引用")
  })

  it("コードブロック (mermaid の図を含む) は抜粋に出さない", () => {
    expect(excerptOf("前\n\n```mermaid\nflowchart LR\n  A --> B\n```\n\n後")).toBe("前 後")
  })

  it("チェックリストの印・表の区切り・区切り線は出さない", () => {
    const md = "- [x] 設計\n- [ ] 実装\n\n| 項目 | 状態 |\n| --- | :---: |\n| API | 完了 |\n\n---\n\n終わり"
    expect(excerptOf(md)).toBe("設計 実装 項目 状態 API 完了 終わり")
  })

  it("画像は代替テキストごと落とし、前後の文は空白 1 つでつなぐ", () => {
    expect(excerptOf("前の文 ![長い代替テキスト](assets/x.svg) 後の文")).toBe("前の文 後の文")
    expect(excerptOf('前の文\n\n![長い代替テキスト](https://example.com/x.png "題")\n\n後の文')).toBe("前の文 後の文")
    expect(excerptOf("前の文![代替テキスト](assets/x.svg)後の文")).toBe("前の文 後の文")
  })

  it("参照形式の画像と定義行は抜粋に出さない", () => {
    const md = '前の文 ![長い代替テキスト][fig] 後の文\n\n[fig]: assets/x.svg "題"'
    expect(excerptOf(md)).toBe("前の文 後の文")
  })

  it("画像のリンクは代替テキストを出さず、ふつうのリンクは文字を残す", () => {
    const md = "前の文 [![代替テキスト](assets/x.svg)](https://example.com) と [リンク](https://example.com)"
    expect(excerptOf(md)).toBe("前の文 と リンク")
  })

  it("長い本文は上限で切って … を付ける", () => {
    expect(excerptOf("あ".repeat(120), 100)).toBe(`${"あ".repeat(100)}…`)
  })

  it("短い本文はそのまま", () => {
    expect(excerptOf("短い")).toBe("短い")
  })
})
