// @perspectives api-contract
// @routes /rss.xml
import { describe, expect, it } from "vitest"
import { buildNowFeed, escapeXml, nowPostPath, nowPostUrl } from "@/lib/now/feed"
import type { NowPost } from "@/lib/now/schema"

const siteUrl = new URL("https://reeschan.pink")

const post = (overrides: Partial<NowPost>): NowPost => ({
  id: "a1",
  title: "題名",
  body: "本文",
  publishedAt: "2026-10-09T01:00:00.000Z",
  ...overrides,
})

const build = (posts: NowPost[]) => buildNowFeed({ siteUrl, title: "サイト", description: "説明", posts })

describe("buildNowFeed", () => {
  it("記事を渡された順に item にし、リンク・guid・日付・抜粋を付ける", () => {
    const xml = build([
      post({ id: "new", title: "新しい記事", body: "## 見出し\n\n**本文**です。", publishedAt: "2026-10-12T03:00:00.000Z" }),
      post({ id: "old", title: "古い記事" }),
    ])
    expect(xml.indexOf("新しい記事")).toBeLessThan(xml.indexOf("古い記事"))
    expect(xml).toContain("<link>https://reeschan.pink/now/new</link>")
    expect(xml).toContain('<guid isPermaLink="false">new</guid>')
    expect(xml).toContain("<pubDate>Mon, 12 Oct 2026 03:00:00 GMT</pubDate>")
    expect(xml).toContain("<description>見出し 本文です。</description>")
  })

  it("lastBuildDate は最新の記事の更新日時で、記事がなければ出さない", () => {
    const updated = post({ updatedAt: "2026-10-13T00:00:00.000Z" })
    expect(build([updated])).toContain("<lastBuildDate>Tue, 13 Oct 2026 00:00:00 GMT</lastBuildDate>")
    const empty = build([])
    expect(empty).not.toContain("<lastBuildDate>")
    expect(empty).not.toContain("<item>")
    expect(empty).toContain('<atom:link href="https://reeschan.pink/rss.xml" rel="self"')
  })

  it("題名と本文の記号は XML として崩れないように逃がす", () => {
    const xml = build([post({ title: "A & B <script>", body: "x < y" })])
    expect(xml).toContain("<title>A &amp; B &lt;script&gt;</title>")
    expect(xml).toContain("<description>x &lt; y</description>")
    expect(xml).not.toContain("<script>")
  })

  it("長い本文は抜粋にして切る", () => {
    const xml = build([post({ body: "あ".repeat(400) })])
    expect(xml).toContain(`<description>${"あ".repeat(300)}…</description>`)
  })
})

describe("nowPostPath", () => {
  it("id を記事ごとのページのパスに安全に埋める", () => {
    expect(nowPostPath("new")).toBe("/now/new")
    expect(nowPostPath("a b&c")).toBe("/now/a%20b%26c")
  })
})

describe("nowPostUrl", () => {
  it("記事ごとのページ (ADR 0030) の絶対 URL を返す", () => {
    expect(nowPostUrl("a b&c", siteUrl)).toBe("https://reeschan.pink/now/a%20b%26c")
  })
})

describe("escapeXml", () => {
  it("XML の 5 つの特殊文字を実体参照にする", () => {
    expect(escapeXml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&apos;")
  })
})
