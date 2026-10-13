import { excerptOf } from "./excerpt"
import type { NowPost } from "./schema"

// /rss.xml の中身。/now の記事を新しい順に item にする (PBI-0020)
// 組み立ては純粋な関数にして、保存先を読む Route Handler と分ける

type FeedOptions = {
  // 本番の URL (lib/metadata.ts の siteUrl)
  siteUrl: URL
  title: string
  description: string
  // 新しい順に並べ済みのもの (lib/now/store.ts)
  posts: readonly NowPost[]
}

// RSS リーダーに出す抜粋の長さ。カード (100 文字) より長めにして、中身の見当が付くようにする
const descriptionLength = 300

export function buildNowFeed({ siteUrl, title, description, posts }: FeedOptions): string {
  const items = posts.map((post) => feedItem(post, siteUrl)).join("")
  // 毎回の現在時刻にすると、記事が増えていなくてもリーダーが更新ありと見なすので、最新の記事の日時を使う
  const lastBuild = posts[0] ? `\n  <lastBuildDate>${toRfc822(lastChangedAt(posts[0]))}</lastBuildDate>` : ""

  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${escapeXml(title)}</title>
  <link>${new URL("/now", siteUrl).href}</link>
  <description>${escapeXml(description)}</description>
  <language>ja</language>${lastBuild}
  <atom:link href="${new URL("/rss.xml", siteUrl).href}" rel="self" type="application/rss+xml" />${items}
</channel>
</rss>
`
}

// 記事ごとのページはないので、/now の詳細ダイアログを開く URL を指す
export function nowPostUrl(id: string, siteUrl: URL): string {
  const url = new URL("/now", siteUrl)
  url.searchParams.set("post", id)
  return url.href
}

function feedItem(post: NowPost, siteUrl: URL): string {
  const link = nowPostUrl(post.id, siteUrl)
  return `
  <item>
    <title>${escapeXml(post.title)}</title>
    <link>${escapeXml(link)}</link>
    <guid isPermaLink="false">${escapeXml(post.id)}</guid>
    <pubDate>${toRfc822(post.publishedAt)}</pubDate>
    <description>${escapeXml(excerptOf(post.body, descriptionLength))}</description>
  </item>`
}

function lastChangedAt(post: NowPost): string {
  return post.updatedAt ?? post.publishedAt
}

// RSS 2.0 の日付は RFC 822 の形式
function toRfc822(iso: string): string {
  return new Date(iso).toUTCString()
}

export function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;")
}
