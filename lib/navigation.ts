// ブラウザ風タブに並べるページ。並び順がそのままタブの順になる。
// ページを足したらここと e2e/fixtures.ts の pages の両方に足す (E2E が並び順を検証している)
// タブの表示名は言語ごとに data/messages/ の nav に持つ
export type NavId = "overview" | "career" | "skills" | "works" | "now" | "chat" | "theme"

export type NavItem = {
  id: NavId
  href: string
}

export const navItems: readonly NavItem[] = [
  { id: "overview", href: "/overview" },
  { id: "career", href: "/career" },
  { id: "skills", href: "/skills" },
  { id: "works", href: "/works" },
  { id: "now", href: "/now" },
  { id: "chat", href: "/chat" },
  { id: "theme", href: "/theme" },
]

// アドレスバーに出すホスト名。実際のドメインとは別の「見た目上の URL」
export const displayHost = "myportfolio.vercel.app"
