// @perspectives content
// @routes /now/[id]
import { describe, expect, it } from "vitest"
import { authorName, siteUrl } from "@/lib/metadata"
import { localizeNowPost } from "@/lib/now/localize"
import { blogPostingJsonLd, postDescriptionLength, serializeJsonLd } from "@/lib/now/structured-data"
import type { NowPost } from "@/lib/now/schema"

const post: NowPost = {
  id: "a1",
  title: "題名",
  body: "本文",
  publishedAt: "2026-10-09T01:00:00.000Z",
}

const postOf = (overrides: Partial<NowPost>): NowPost => ({ ...post, ...overrides })

// 記事ページと同じく、題名・本文・言語は localizeNowPost が出し分けたものを渡す
const jsonLdOf = (target: NowPost) =>
  blogPostingJsonLd({ post: target, localized: localizeNowPost(target, "ja"), url: `${siteUrl.href}/now/a1` })

describe("blogPostingJsonLd", () => {
  it("BlogPosting に必要な値 (本文・著者・言語・URL) を返す", () => {
    expect(jsonLdOf(post)).toEqual({
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
    expect(jsonLdOf(post).dateModified).toBe(post.publishedAt)
    expect(jsonLdOf(postOf({ updatedAt: "2026-10-13T00:00:00.000Z" })).dateModified).toBe("2026-10-13T00:00:00.000Z")
  })

  it("説明文は Markdown の記号を落とした本文の抜粋 (excerptOf) を使い、postDescriptionLength で切る", () => {
    expect(jsonLdOf(postOf({ body: "## 見出し\n\n**本文**です。" })).description).toBe("見出し 本文です。")
    expect(jsonLdOf(postOf({ body: "あ".repeat(postDescriptionLength * 3) })).description).toBe(`${"あ".repeat(postDescriptionLength)}…`)
  })

  it("英語版を渡すと headline・description が英語になり、inLanguage も en になる", () => {
    const translated = postOf({
      en: { title: "English title", body: "English body", source: "owner", updatedAt: "2026-10-10T00:00:00.000Z" },
    })
    const jsonLd = blogPostingJsonLd({ post: translated, localized: localizeNowPost(translated, "en"), url: "u" })
    expect(jsonLd.headline).toBe("English title")
    expect(jsonLd.description).toBe("English body")
    expect(jsonLd.inLanguage).toBe("en")
  })

  it("英語の画面でも英語版が無い記事は日本語のまま、inLanguage は ja", () => {
    const jsonLd = blogPostingJsonLd({ post, localized: localizeNowPost(post, "en"), url: "u" })
    expect(jsonLd.headline).toBe("題名")
    expect(jsonLd.inLanguage).toBe("ja")
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
