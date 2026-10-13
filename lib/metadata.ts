// サイト名。タブのタイトルの後ろに付ける
export const siteName = "Ryuki Tobita's Portfolio"

export function pageTitle(page: string): string {
  return `${page} | ${siteName}`
}
