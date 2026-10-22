import type { Metadata } from "next"
import { profile } from "@/data/overview"

// サイト名。タブのタイトルの後ろに付ける
export const siteName = "Ryuki Tobita's Portfolio"

// 本番の URL (ADR 0029)。canonical・OGP・sitemap・robots・RSS・アドレスバーの表示はすべてここから作る
// プレビューのデプロイでも本番の URL を指させ、検索エンジンに重複したページとして扱わせない
// ホストは Vercel の Domains の primary (www) に合わせる。apex は www へ 308 で転送されるので、
// apex を名乗ると canonical や sitemap が転送元を指してしまう (PBI-0027)
export const siteUrl = new URL("https://www.reeschan.pink")

// 筆者。/now の記事の OGP と JSON-LD の author に使う (ADR 0030)
// 名前はプロフィールの表示データから取る。構造化データの Person と同じ値を二重に持たないため
export const authorName = profile.name

// アドレスバー風の帯に出すホスト名
export const displayHost = siteUrl.host

// SNS に URL を貼ったときに出る画像 (app/opengraph-image.tsx が描く)
export const ogImage = { path: "/opengraph-image", width: 1200, height: 630, alt: "Ryuki Tobita — Full-stack Developer" } as const

// 画像の版。app/opengraph-image.tsx の描き方を変えたら上げる。SNS は URL ごとに画像を長く覚えるので、版を変えると取り直させられる
// 2: 画像に描くホストが www になった (PBI-0027)
export const ogImageVersion = 2

// og:image と twitter:image に使う版付きのパス。URL は 1 か所で作る (相対パスは Next.js が siteUrl から絶対 URL にする)
export const ogImagePath = `${ogImage.path}?v=${ogImageVersion}`

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
    // 表示言語は Cookie で切り替わるが、クローラは Cookie を送らないので言語に合わせても検索には効かない。og:locale は ja_JP に固定する
    locale: "ja_JP",
    images: [{ url: ogImagePath, width: ogImage.width, height: ogImage.height, alt: ogImage.alt }],
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
    twitter: { card: "summary_large_image", title, description, images: [ogImagePath] },
  }
}
