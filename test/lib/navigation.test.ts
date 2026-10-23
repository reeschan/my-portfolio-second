// @perspectives navigation
// @routes /overview /career /skills /works /now /chat /theme
import { existsSync, readdirSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { navItems } from "@/lib/navigation"

// タブ付きのページはルートグループ app/(tabs)/ に置く (ADR 0035)。URL からはグループ名が落ちるので、
// ページの場所を確かめるときはグループの中のディレクトリも見る
const appDir = path.resolve(__dirname, "../../app")
const routeGroupPattern = /^\(.*\)$/

function isRouteGroup(entry: { isDirectory: () => boolean; name: string }): boolean {
  return entry.isDirectory() && routeGroupPattern.test(entry.name)
}

// "/overview" のページが app/(任意のグループ)/overview/page.tsx か app/overview/page.tsx にあるか
function pageFile(route: string): string | null {
  const segment = route.replace(/^\//, "")
  const candidates = [
    path.join(appDir, segment, "page.tsx"),
    ...readdirSync(appDir, { withFileTypes: true })
      .filter(isRouteGroup)
      .map((entry) => path.join(appDir, entry.name, segment, "page.tsx")),
  ]
  return candidates.find((candidate) => existsSync(candidate)) ?? null
}

// トップ (app/page.tsx) 以外の、URL に載るページ。ルートグループは URL に出さない
function pageRoutes(): string[] {
  const routes: string[] = []
  for (const entry of readdirSync(appDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue

    if (isRouteGroup(entry)) {
      const groupDir = path.join(appDir, entry.name)
      for (const page of readdirSync(groupDir, { withFileTypes: true })) {
        if (page.isDirectory() && existsSync(path.join(groupDir, page.name, "page.tsx"))) routes.push(`/${page.name}`)
      }
      continue
    }

    if (existsSync(path.join(appDir, entry.name, "page.tsx"))) routes.push(`/${entry.name}`)
  }
  return routes
}

describe("navItems", () => {
  it("タブの遷移先は app/ に実在するページだけ", () => {
    for (const item of navItems) {
      expect(pageFile(item.href), item.href).not.toBeNull()
    }
  })

  it("app/ のページ (トップ以外) はすべてタブに並んでいる", () => {
    expect([...navItems.map((i) => i.href)].sort()).toEqual(pageRoutes().sort())
  })
})
