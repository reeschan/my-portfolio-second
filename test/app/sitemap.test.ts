// @coverage-map ignore sitemap.xml は page でも route.ts でもなく表の対象外。E2E は e2e/seo.spec.ts
import { describe, expect, it } from "vitest"
import sitemap from "@/app/sitemap"
import { siteUrl } from "@/lib/metadata"
import { navItems } from "@/lib/navigation"

describe("sitemap", () => {
  it("トップとタブの全ページを本番の URL で載せる", () => {
    const urls = sitemap().map((entry) => entry.url)
    expect(urls).toEqual([siteUrl.href, ...navItems.map((item) => new URL(item.href, siteUrl).href)])
  })
})
