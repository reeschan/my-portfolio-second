// ブラウザ風タブに並べるページ。並び順がそのままタブの順になる。
// ページを足したらここと e2e/fixtures.ts の pages の両方に足す (E2E が並び順を検証している)
// タブの表示名は言語ごとに data/messages/ の nav に持つ
export type NavId = "overview" | "career" | "skills" | "works" | "now" | "chat" | "contact" | "theme"

export type NavItem = {
  id: NavId
  href: string
  // 読ませる中身を持たない設定や操作のためのページ。検索に載せず sitemap にも出さない (docs/specs/seo-stage2.md)
  utility?: true
}

export const navItems: readonly NavItem[] = [
  { id: "overview", href: "/overview" },
  { id: "career", href: "/career" },
  { id: "skills", href: "/skills" },
  { id: "works", href: "/works" },
  { id: "now", href: "/now" },
  { id: "chat", href: "/chat" },
  { id: "contact", href: "/contact" },
  // 背景のテーマを選ぶだけのページ。タブには残すが、索引には載せない
  { id: "theme", href: "/theme", utility: true },
]

// 道具のページか。sitemap と metadata (noindex) の判断が同じ印を見るよう、この 1 か所に寄せる
export function isUtilityPage(href: string): boolean {
  return navItems.some((item) => item.href === href && item.utility === true)
}
