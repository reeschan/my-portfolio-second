// @perspectives content
// @routes /overview
import { describe, expect, it } from "vitest"
import { pageGuides, profileLinks } from "@/data/overview"
import { navItems } from "@/lib/navigation"

describe("overview のデータ", () => {
  it("概要以外のすべてのタブに、タブと同じ順で案内がある (ページを足したら案内の書き忘れに気づける)", () => {
    const tabs = navItems.filter((item) => item.href !== "/overview").map((item) => item.href)
    expect(pageGuides.map((guide) => guide.href)).toEqual(tabs)
  })

  it("案内の説明が空でない", () => {
    for (const guide of pageGuides) {
      expect(guide.description.trim()).not.toBe("")
    }
  })

  it("外部のプロフィールは https の URL で、GitHub を含む", () => {
    for (const link of profileLinks) {
      expect(link.href.startsWith("https://")).toBe(true)
    }
    expect(profileLinks).toContainEqual({ label: "GitHub", href: "https://github.com/reeschan" })
  })
})
