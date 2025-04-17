import { NextResponse } from "next/server"

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://myportfolio.vercel.app"
  
  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Ryuki Tobita's Portfolio</title>
  <link>${baseUrl}</link>
  <description>Ryuki Tobitaのポートフォリオサイトの更新情報</description>
  <language>ja</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
  
  <item>
    <title>ポートフォリオサイト準備中</title>
    <link>${baseUrl}</link>
    <pubDate>${new Date().toUTCString()}</pubDate>
    <guid>${baseUrl}?id=1</guid>
    <description>ポートフォリオサイトは現在準備中です。5月に完成予定です。ご期待ください！</description>
  </item>
</channel>
</rss>`

  return new NextResponse(rss, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "s-maxage=86400, stale-while-revalidate",
    },
  })
}
