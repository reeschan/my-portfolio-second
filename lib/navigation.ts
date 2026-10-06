// ブラウザ風タブに並べるページ。並び順がそのままタブの順になる。
// ページを足したらここと e2e/fixtures.ts の pages の両方に足す (E2E が並び順を検証している)
export type NavItem = {
  label: string
  href: string
}

export const navItems: readonly NavItem[] = [
  { label: "概要", href: "/overview" },
  { label: "経歴", href: "/career" },
  { label: "スキル", href: "/skills" },
  { label: "ワーク", href: "/works" },
  { label: "Now", href: "/now" },
  { label: "チャット", href: "/chat" },
]

// アドレスバーに出すホスト名。実際のドメインとは別の「見た目上の URL」
export const displayHost = "myportfolio.vercel.app"
