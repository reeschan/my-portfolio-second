// @perspectives content
// @routes /now/[id]
import { describe, expect, it } from "vitest"
import { authorName, ogImage, ogImagePath, ogImageVersion, pageMetadata, siteName, siteUrl } from "@/lib/metadata"

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

describe("OG の画像と locale", () => {
  const variants = [
    { label: "article なし", metadata: pageMetadata(base) },
    {
      label: "article あり",
      metadata: pageMetadata({ ...base, article: { publishedTime: "2026-10-09T01:00:00.000Z" } }),
    },
  ]

  it.each(variants)("$label のとき、openGraph と twitter の画像がどちらも版付きのパスになる", ({ metadata }) => {
    // 画像の描き方を変えたら版が上がり、URL が変わるので SNS に新しい画像を取り直させられる
    expect(ogImagePath).toBe(`/opengraph-image?v=${ogImageVersion}`)
    expect(metadata.openGraph?.images).toEqual([{ url: ogImagePath, width: ogImage.width, height: ogImage.height, alt: ogImage.alt }])
    expect(metadata.twitter?.images).toEqual([ogImagePath])
  })

  it.each(variants)("$label のとき、openGraph の locale は ja_JP になる", ({ metadata }) => {
    // クローラは表示言語の Cookie を送らないので、表示言語によらず固定する
    expect(metadata.openGraph).toMatchObject({ locale: "ja_JP" })
  })

  it("版付きのパスは、siteUrl から絶対 URL にすると自サイトの URL になる", () => {
    expect(new URL(ogImagePath, siteUrl).href.startsWith(siteUrl.origin)).toBe(true)
  })
})
