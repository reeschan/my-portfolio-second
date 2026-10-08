// @perspectives navigation
// @routes /overview /career /skills /works /now /chat /theme
import { readdirSync, existsSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { navItems } from "./navigation"

describe("navItems", () => {
  it("タブの遷移先は app/ に実在するページだけ", () => {
    const appDir = path.resolve(__dirname, "../app")
    for (const item of navItems) {
      expect(existsSync(path.join(appDir, item.href, "page.tsx")), item.href).toBe(true)
    }
  })

  it("app/ のページ (トップ以外) はすべてタブに並んでいる", () => {
    const appDir = path.resolve(__dirname, "../app")
    const pageDirs = readdirSync(appDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(path.join(appDir, d.name, "page.tsx")))
      .map((d) => `/${d.name}`)
    expect([...navItems.map((i) => i.href)].sort()).toEqual(pageDirs.sort())
  })
})
