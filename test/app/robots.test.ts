// @coverage-map ignore robots.txt は page でも route.ts でもなく表の対象外。E2E は e2e/seo.spec.ts
import { describe, expect, it } from "vitest"
import robots from "@/app/robots"
import { siteUrl } from "@/lib/metadata"

describe("robots", () => {
  it("API を巡回させず、sitemap の場所を示す", () => {
    const result = robots()
    expect(result.rules).toEqual({ userAgent: "*", allow: "/", disallow: "/api/" })
    expect(result.sitemap).toBe(`${siteUrl.origin}/sitemap.xml`)
  })
})
