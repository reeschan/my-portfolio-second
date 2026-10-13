// @perspectives content
// @routes /overview
import { existsSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { profileEn } from "@/data/en/overview"
import { pageGuides, profile, profileLinks } from "@/data/overview"
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

  it("外部のプロフィールは https の URL で、GitHub と LinkedIn を含む", () => {
    for (const link of profileLinks) {
      expect(link.href.startsWith("https://")).toBe(true)
    }
    expect(profileLinks).toContainEqual({ label: "GitHub", href: "https://github.com/reeschan" })
    expect(profileLinks.map((link) => link.label)).toContain("LinkedIn")
  })

  it("メインのアイコンが public/ にあり、日英で同じ画像を使い、代替テキストがある", () => {
    expect(existsSync(path.join(process.cwd(), "public", profile.avatar.src))).toBe(true)
    expect(profileEn.avatar.src).toBe(profile.avatar.src)
    for (const alt of [profile.avatar.alt, profileEn.avatar.alt]) expect(alt.trim()).not.toBe("")
  })
})
