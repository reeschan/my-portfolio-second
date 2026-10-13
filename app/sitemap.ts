import type { MetadataRoute } from "next"
import { siteUrl } from "@/lib/metadata"
import { navItems } from "@/lib/navigation"

// トップとタブに並ぶページを載せる。ページを足すと lib/navigation.ts 経由でここにも載る (ADR 0029)
export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", ...navItems.map((item) => item.href)].map((path) => ({ url: new URL(path, siteUrl).href }))
}
