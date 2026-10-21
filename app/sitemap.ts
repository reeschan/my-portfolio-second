import type { MetadataRoute } from "next"
import { connection } from "next/server"
import { siteUrl } from "@/lib/metadata"
import { isUtilityPage, navItems } from "@/lib/navigation"
import { nowPostPath } from "@/lib/now/feed"
import type { NowPost } from "@/lib/now/schema"
import { getNowStore } from "@/lib/now/store"

// トップとタブに並ぶページを載せる。ページを足すと lib/navigation.ts 経由でここにも載る (ADR 0029)
// 道具のページ (印の付いたページ) は中身が薄く索引に要らないので外す (docs/specs/seo-stage2.md)
// /now の記事も載せる。記事は POST /api/now でいつでも増えるので、ビルド時に固めずリクエストごとに保存先から読む (ADR 0030)
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Request-time API。これが無いとビルド時の sitemap が配られ、あとから増えた記事が載らない
  await connection()

  const fixedPaths = ["/", ...navItems.filter((item) => !isUtilityPage(item.href)).map((item) => item.href)]
  const posts = await loadPosts()
  return [
    ...fixedPaths.map((path) => ({ url: new URL(path, siteUrl).href })),
    ...posts.map((post) => ({
      url: new URL(nowPostPath(post.id), siteUrl).href,
      lastModified: post.updatedAt ?? post.publishedAt,
    })),
  ]
}

// 保存先が落ちていても記事だけを諦め、固定のページは返す (検索エンジンにエラーを見せ続けない)。app/rss.xml/route.ts と同じ作り
async function loadPosts(): Promise<NowPost[]> {
  const store = getNowStore()
  if (!store) return []
  try {
    return await store.list()
  } catch (error) {
    console.error("Failed to load now posts for sitemap", error)
    return []
  }
}
