// サイト名。タブのタイトルの後ろに付ける
export const siteName = "Ryuki Tobita's Portfolio"

// 本番の URL (ADR 0029)。canonical・OGP・sitemap・robots・RSS・アドレスバーの表示はすべてここから作る
// プレビューのデプロイでも本番の URL を指させ、検索エンジンに重複したページとして扱わせない
export const siteUrl = new URL("https://reeschan.pink")

// アドレスバー風の帯に出すホスト名
export const displayHost = siteUrl.host

export function pageTitle(page: string): string {
  return `${page} | ${siteName}`
}
