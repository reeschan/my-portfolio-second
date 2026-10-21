// @perspectives seo
// @routes / /overview
import { describe, expect, it } from "vitest"
import { ja } from "@/data/messages/ja"
import { profile, profileLinks } from "@/data/overview"
import { authorName, pageTitle, siteName, siteUrl } from "@/lib/metadata"
import { serializeJsonLd } from "@/lib/now/structured-data"
import { personId, profilePageJsonLd, siteGraphJsonLd, websiteId } from "@/lib/structured-data"

type JsonLdNode = Record<string, unknown>

const jsonLd = siteGraphJsonLd()

// @graph から型で探す。@type は文字列で入る (このサイトの構造化データは複数の型を持たない)
const nodes = (jsonLd["@graph"] as JsonLdNode[]).filter((node) => typeof node["@type"] === "string")
const ofType = (type: string): JsonLdNode[] => nodes.filter((node) => node["@type"] === type)

describe("siteGraphJsonLd", () => {
  it("schema.org の @context と、WebSite・Person をちょうど 1 つずつ持つ @graph を返す", () => {
    expect(jsonLd["@context"]).toBe("https://schema.org")
    expect(ofType("WebSite")).toHaveLength(1)
    expect(ofType("Person")).toHaveLength(1)
  })

  it("Person・WebSite の @id は正のホストの URL に #person・#website を付けたものになる", () => {
    expect(personId).toBe(new URL("#person", siteUrl).href)
    expect(websiteId).toBe(new URL("#website", siteUrl).href)
    expect(ofType("Person")[0]?.["@id"]).toBe(personId)
    expect(ofType("WebSite")[0]?.["@id"]).toBe(websiteId)
  })

  it("WebSite はサイト名・正のホストの URL・日本語・発行者として Person の @id を持つ", () => {
    expect(ofType("WebSite")[0]).toEqual({
      "@type": "WebSite",
      "@id": websiteId,
      name: siteName,
      url: siteUrl.href,
      inLanguage: "ja",
      publisher: { "@id": personId },
    })
  })

  it("Person はプロフィールの表示データから名前・職種・画像・sameAs (GitHub と LinkedIn) を作る", () => {
    expect(ofType("Person")[0]).toEqual({
      "@type": "Person",
      "@id": personId,
      name: profile.name,
      jobTitle: profile.role,
      url: siteUrl.href,
      image: new URL(profile.avatar.src, siteUrl).href,
      sameAs: profileLinks.map((link) => link.href),
    })
  })

  it("WebSite の publisher の @id は Person の @id と同じ", () => {
    const website = ofType("WebSite")[0]
    const person = ofType("Person")[0]
    expect(website?.["publisher"]).toEqual({ "@id": person?.["@id"] })
  })

  it("Person の name は記事の著者名 (authorName) と同じで、名前を二重に持たない", () => {
    expect(ofType("Person")[0]?.["name"]).toBe(authorName)
  })
})

describe("profilePageJsonLd", () => {
  const profilePage = profilePageJsonLd()

  it("ProfilePage の url は /overview の絶対 URL、name はタブの表示名から作った題名になる", () => {
    expect(profilePage).toEqual({
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      name: pageTitle(ja.nav.overview),
      url: new URL("/overview", siteUrl).href,
      mainEntity: { "@id": personId },
      inLanguage: "ja",
    })
  })

  it("mainEntity はレイアウトの Person を @id で指し、Person をその場に書かない", () => {
    expect(profilePage["mainEntity"]).toEqual({ "@id": personId })
    // 同じ人物をページの側でもう一度書くと、1 ページに Person が 2 つあることになる
    expect(profilePage["mainEntity"]).not.toHaveProperty("@type")
    expect(profilePage["mainEntity"]).not.toHaveProperty("name")
  })

  it("serializeJsonLd で書き出しても < を含まず、JSON.parse で元に戻る", () => {
    const serialized = serializeJsonLd(profilePage)
    expect(serialized).not.toContain("<")
    expect(JSON.parse(serialized)).toEqual(profilePage)
  })
})

describe("serializeJsonLd", () => {
  it("サイト全体の構造化データを書き出しても < を含まず、JSON.parse で元に戻る", () => {
    const serialized = serializeJsonLd(siteGraphJsonLd())
    expect(serialized).not.toContain("<")
    expect(JSON.parse(serialized)).toEqual(siteGraphJsonLd())
  })
})
