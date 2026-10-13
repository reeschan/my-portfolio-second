import { siteUrl } from "@/lib/metadata"

export function GET() {
  // 末尾の / を除いて、パスとつなげられるようにする
  const baseUrl = siteUrl.origin

  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Ryuki Tobita's Portfolio</title>
  <link>${baseUrl}</link>
  <description>Ryuki Tobitaのポートフォリオサイトの更新情報</description>
  <language>ja</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
</channel>
</rss>`

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "s-maxage=86400, stale-while-revalidate",
    },
  })
}
