// @perspectives content
// @routes /now/[id]
import { describe, expect, it } from "vitest"
import { authorName, pageMetadata, siteName } from "@/lib/metadata"

const base = { title: "題名", description: "説明", path: "/now" }

describe("pageMetadata", () => {
  it("article を渡さないと、openGraph は既存のままである (type website、canonical は渡したパス)", () => {
    const metadata = pageMetadata(base)
    // Metadata.openGraph は type を区別子とするユニオン型なので、記事固有のキーも含めてまとめて比べる
    expect(metadata.openGraph).toMatchObject({ type: "website" })
    expect(metadata.alternates?.canonical).toBe("/now")
  })

  it("article を渡すと、openGraph が type article になり、公開日・更新日・著者を入れる", () => {
    const metadata = pageMetadata({
      ...base,
      article: { publishedTime: "2026-10-09T01:00:00.000Z", modifiedTime: "2026-10-13T00:00:00.000Z" },
    })
    expect(metadata.openGraph).toMatchObject({
      type: "article",
      publishedTime: "2026-10-09T01:00:00.000Z",
      modifiedTime: "2026-10-13T00:00:00.000Z",
      authors: [authorName],
    })
    expect(metadata.alternates?.canonical).toBe("/now")
  })

  it("article を渡したときも、siteName・画像・twitter は article なしのときと同じ", () => {
    const withoutArticle = pageMetadata(base)
    const withArticle = pageMetadata({ ...base, article: { publishedTime: "2026-10-09T01:00:00.000Z" } })
    expect(withArticle.openGraph).toMatchObject({ siteName, description: "説明", url: "/now" })
    expect(withArticle.openGraph?.images).toEqual(withoutArticle.openGraph?.images)
    expect(withArticle.twitter).toEqual(withoutArticle.twitter)
  })

  it("article を渡しても modifiedTime がなければ、modifiedTime のキーを出さない", () => {
    const metadata = pageMetadata({ ...base, article: { publishedTime: "2026-10-09T01:00:00.000Z" } })
    expect(metadata.openGraph).not.toHaveProperty("modifiedTime")
  })
})
