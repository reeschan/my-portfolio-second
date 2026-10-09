// @perspectives content
// @routes /now
import { describe, expect, it } from "vitest"
import { excerptOf } from "./excerpt"

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

  it("長い本文は上限で切って … を付ける", () => {
    expect(excerptOf("あ".repeat(120), 100)).toBe(`${"あ".repeat(100)}…`)
  })

  it("短い本文はそのまま", () => {
    expect(excerptOf("短い")).toBe("短い")
  })
})
