// @coverage-map ignore リポジトリの運用 (リリース PR) の道具のため
import { describe, expect, it } from "vitest"
// ワークフローから Node で直接実行するため JS (.mjs) のままにしている。ここでは API を呼ばない純粋関数だけを検証する
import { buildReleaseBody, extractSummary, releaseTitle, selectReleasedPrs } from "@/scripts/release-pr.mjs"

type Pr = Parameters<typeof selectReleasedPrs>[0][number]

function pr(overrides: Partial<Pr> & Pick<Pr, "number">): Pr {
  return {
    title: `PR ${overrides.number}`,
    html_url: `https://github.com/reeschan/my-portfolio-second/pull/${overrides.number}`,
    user: { login: "reeschan" },
    merged_at: "2026-10-01T00:00:00Z",
    head: { ref: `feature/${overrides.number}` },
    body: null,
    ...overrides,
  }
}

describe("extractSummary", () => {
  it("概要見出しの直後の、コメントと空行を飛ばした最初の行を返す", () => {
    const body = [
      "## 概要",
      "",
      "<!-- 何を・なぜ変えたかを書く",
      "複数行のコメント -->",
      "",
      "- リリース PR を自動で作る",
      "",
      "## 変更点",
      "- x",
    ].join("\n")
    expect(extractSummary(body)).toBe("リリース PR を自動で作る")
  })

  it("CRLF の本文でも取り出せる", () => {
    expect(extractSummary("## 概要\r\n\r\n背景を変えた\r\n")).toBe("背景を変えた")
  })

  it("入れ子や閉じていない HTML コメントを残さない", () => {
    // 1 回の置換で消すと、間の <!-- --> が消えて新しい <!-- ができる
    expect(extractSummary("## 概要\n\n<!<!-- x -->-- 隠したい -->本文")).toBe("本文")
    expect(extractSummary("## 概要\n\n見える行 <!-- 閉じていない\n続き")).toBe("見える行")
  })

  it("見出しが無い・中身が無い・本文が null なら空文字", () => {
    expect(extractSummary("## 変更点\n- x")).toBe("")
    expect(extractSummary("## 概要\n\n<!-- 未記入 -->\n\n## 変更点\n- x")).toBe("")
    expect(extractSummary(null)).toBe("")
  })

  it("200 文字を超えたら 200 文字で切って … を付ける", () => {
    const long = "あ".repeat(250)
    expect(extractSummary(`## 概要\n${long}`)).toBe(`${"あ".repeat(200)}…`)
    expect(extractSummary(`## 概要\n${"い".repeat(200)}`)).toBe("い".repeat(200))
  })
})

describe("selectReleasedPrs", () => {
  it("未マージ・前回のリリース以前・head が main のものを除き、マージの古い順に並べる", () => {
    const prs = [
      pr({ number: 5, merged_at: "2026-10-05T00:00:00Z" }),
      pr({ number: 2, merged_at: null }),
      pr({ number: 1, merged_at: "2026-09-01T00:00:00Z" }),
      pr({ number: 3, merged_at: "2026-10-03T00:00:00Z" }),
      pr({ number: 4, merged_at: "2026-10-04T00:00:00Z", head: { ref: "main" } }),
    ]
    expect(selectReleasedPrs(prs, "2026-09-15T00:00:00Z").map((p) => p.number)).toEqual([3, 5])
  })

  it("前回のリリースが無ければ時刻では絞らない", () => {
    const prs = [pr({ number: 2, merged_at: "2026-10-02T00:00:00Z" }), pr({ number: 1, merged_at: "2026-01-01T00:00:00Z" })]
    expect(selectReleasedPrs(prs, null).map((p) => p.number)).toEqual([1, 2])
  })
})

describe("buildReleaseBody", () => {
  const compareUrl = "https://github.com/reeschan/my-portfolio-second/compare/main...develop"
  const generatedAt = "2026-10-10T03:00:00.000Z"

  it("PR の行・概要・件数・差分のリンク・チェックリストを載せる", () => {
    const body = buildReleaseBody({
      prs: [
        pr({ number: 12, title: "feat: リリース PR", user: { login: "alice" }, body: "## 概要\n- develop → main の PR を自動で作る" }),
        pr({ number: 13, title: "fix: typo", user: { login: "bob" }, body: null }),
      ],
      compareUrl,
      generatedAt,
    })
    expect(body.startsWith("<!-- release-pr: このコメントより下は release-pr ワークフローが自動で書き換える。")).toBe(true)
    expect(body).toContain("前回のリリース以降にマージされた PR は 2 件")
    expect(body).toContain("- #12 feat: リリース PR (@alice)\n  - develop → main の PR を自動で作る\n- #13 fix: typo (@bob)\n")
    expect(body).toContain(compareUrl)
    for (const item of [
      "- [ ] CI (ci-ok) が緑",
      "- [ ] Vercel のプレビューで主要な画面を確かめた",
      "- [ ] Squash and merge でマージする (main は Squash のみ)",
      "- [ ] マージ後、main を develop にマージして揃える",
    ]) {
      expect(body).toContain(item)
    }
    expect(body.trimEnd().endsWith(`生成: ${generatedAt}`)).toBe(true)
    // 見出しの順番
    const order = ["## 概要", "## 含まれる PR", "## 差分", "## マージの前に"].map((h) => body.indexOf(h))
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })

  it("0 件ならその旨を書く", () => {
    const body = buildReleaseBody({ prs: [], compareUrl, generatedAt })
    expect(body).toContain("前回のリリース以降にマージされた PR は 0 件")
    expect(body).toContain("(前回のリリース以降にマージされた PR はありません)")
  })
})

describe("releaseTitle", () => {
  it("日付を Asia/Tokyo で数える", () => {
    expect(releaseTitle(new Date("2026-10-10T16:00:00Z"))).toBe("release: develop → main (2026-10-11)")
    expect(releaseTitle(new Date("2026-10-10T14:59:59Z"))).toBe("release: develop → main (2026-10-10)")
  })
})
