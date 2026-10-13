import type { MetadataRoute } from "next"
import { siteUrl } from "@/lib/metadata"

// 検索エンジンにはページだけを巡回させる。API は人が読むものではないので除く (ADR 0029)
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: new URL("/sitemap.xml", siteUrl).href,
  }
}
