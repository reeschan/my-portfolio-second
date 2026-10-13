import { connection } from "next/server"
import { siteName, siteUrl } from "@/lib/metadata"
import { buildNowFeed } from "@/lib/now/feed"
import type { NowPost } from "@/lib/now/schema"
import { getNowStore } from "@/lib/now/store"

// /now の記事の RSS フィード (PBI-0020)
export async function GET() {
  // 記事は POST /api/now でいつでも増えるので、ビルド時に固めずリクエストごとに読む
  await connection()
  const rss = buildNowFeed({
    siteUrl,
    title: siteName,
    description: "Ryuki Tobita がいま取り組んでいること (/now) の新着記事",
    posts: await loadPosts(),
  })

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml",
      // リーダーは頻繁に取りに来るので、CDN に 1 時間持たせる
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  })
}

// 保存先が落ちていても、フィードは空の一覧で返す (リーダーにエラーを見せ続けない)
async function loadPosts(): Promise<NowPost[]> {
  const store = getNowStore()
  if (!store) return []
  try {
    return await store.list()
  } catch (error) {
    console.error("Failed to load now posts for RSS", error)
    return []
  }
}
