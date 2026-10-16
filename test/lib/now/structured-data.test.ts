// @perspectives content
// @routes /now/[id]
import { describe, expect, it } from "vitest"
import { authorName, siteUrl } from "@/lib/metadata"
import { blogPostingJsonLd, postDescriptionLength, serializeJsonLd } from "@/lib/now/structured-data"
import type { NowPost } from "@/lib/now/schema"

const post: NowPost = {
  id: "a1",
  title: "題名",
  body: "本文",
  publishedAt: "2026-10-09T01:00:00.000Z",
}

const postOf = (overrides: Partial<NowPost>): NowPost => ({ ...post, ...overrides })

describe("blogPostingJsonLd", () => {
  it("BlogPosting に必要な値 (本文・著者・言語・URL) を返す", () => {
    const jsonLd = blogPostingJsonLd({ post, url: `${siteUrl.href}/now/a1` })
    expect(jsonLd).toEqual({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: "題名",
      description: "本文",
      datePublished: "2026-10-09T01:00:00.000Z",
      dateModified: "2026-10-09T01:00:00.000Z",
      author: { "@type": "Person", name: authorName, url: siteUrl.href },
      url: `${siteUrl.href}/now/a1`,
      mainEntityOfPage: `${siteUrl.href}/now/a1`,
      inLanguage: "ja",
    })
  })

  it("updatedAt が無いときの dateModified は publishedAt、あるときは updatedAt", () => {
    expect(blogPostingJsonLd({ post, url: "u" }).dateModified).toBe(post.publishedAt)
    expect(blogPostingJsonLd({ post: postOf({ updatedAt: "2026-10-13T00:00:00.000Z" }), url: "u" }).dateModified).toBe(
      "2026-10-13T00:00:00.000Z",
    )
  })

  it("説明文は Markdown の記号を落とした本文の抜粋 (excerptOf) を使い、postDescriptionLength で切る", () => {
    expect(blogPostingJsonLd({ post: postOf({ body: "## 見出し\n\n**本文**です。" }), url: "u" }).description).toBe("見出し 本文です。")
    expect(blogPostingJsonLd({ post: postOf({ body: "あ".repeat(postDescriptionLength * 3) }), url: "u" }).description).toBe(
      `${"あ".repeat(postDescriptionLength)}…`,
    )
  })
})

describe("serializeJsonLd", () => {
  it("題名に </script> を含めても、出力に < が 1 文字も含まれない", () => {
    const data = { "@type": "BlogPosting", headline: "</script><script>alert(1)</script>" }
    const json = serializeJsonLd(data)
    expect(json).not.toContain("<")
    expect(JSON.parse(json)).toEqual(data)
  })

  it("JSON.parse すると元の値に戻る", () => {
    const data = { "@type": "BlogPosting", headline: "a<b</script>" }
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data)
  })
})
