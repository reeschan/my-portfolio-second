import type { Metadata } from "next"

// サイト名。タブのタイトルの後ろに付ける
export const siteName = "Ryuki Tobita's Portfolio"

// 本番の URL (ADR 0029)。canonical・OGP・sitemap・robots・RSS・アドレスバーの表示はすべてここから作る
// プレビューのデプロイでも本番の URL を指させ、検索エンジンに重複したページとして扱わせない
export const siteUrl = new URL("https://reeschan.pink")

// 筆者。/now の記事の OGP と JSON-LD の author に使う (data/overview.ts の name と同じ表記。ADR 0030)
export const authorName = "Ryuki Tobita"

// アドレスバー風の帯に出すホスト名
export const displayHost = siteUrl.host

// SNS に URL を貼ったときに出る画像 (app/opengraph-image.tsx が描く)
export const ogImage = { path: "/opengraph-image", width: 1200, height: 630, alt: "Ryuki Tobita — Full-stack Developer" } as const

export function pageTitle(page: string): string {
  return `${page} | ${siteName}`
}

// ページごとの metadata。言語は Cookie で切り替えて URL は 1 つなので、canonical はパスだけで決まる
// openGraph は親 (app/layout.tsx) と深くは混ざらず丸ごと置き換わる。子のページで画像が消えないよう、siteName・type・画像もここで毎回渡す
export function pageMetadata({
  title,
  description,
  path,
  article,
}: {
  title: string
  description: string
  path: string
  article?: { publishedTime: string; modifiedTime?: string }
}): Metadata {
  // article の有無で type・公開日・著者が変わるだけで、画像などはどちらも同じなので共通部分を 1 つにまとめる
  const openGraphBase = {
    title,
    description,
    url: path,
    siteName,
    images: [{ url: ogImage.path, width: ogImage.width, height: ogImage.height, alt: ogImage.alt }],
  }
  return {
    title,
    description,
    // RSS リーダーやブラウザの拡張がフィードを見つけられるよう、全ページから /rss.xml を示す (PBI-0020)
    alternates: { canonical: path, types: { "application/rss+xml": "/rss.xml" } },
    openGraph: article
      ? {
          // 記事のページ (ADR 0030)。一度も更新していない記事もあるので modifiedTime はあるときだけ出す
          ...openGraphBase,
          type: "article",
          publishedTime: article.publishedTime,
          authors: [authorName],
          ...(article.modifiedTime ? { modifiedTime: article.modifiedTime } : {}),
        }
      : { ...openGraphBase, type: "website" },
    twitter: { card: "summary_large_image", title, description, images: [ogImage.path] },
  }
}
