// /overview の内容。自己紹介・外部のプロフィールへのリンク・各ページの案内をここにまとめる (PBI-0013)
// 英語版は data/en/overview.ts。言語ごとの切り替えは data/localized.ts (PBI-0014)

export type ProfileLink = {
  label: string
  href: string
}

export type Profile = {
  name: string
  role: string
  // 丸く切り抜いて出すメインのアイコン (public/ からのパス) と代替テキスト
  avatar: { src: string; alt: string }
  // 段落ごとに 1 要素
  summary: readonly string[]
}

export type PageGuide = {
  // lib/navigation.ts の href と同じ値。タブの表示名はそちらから引く
  href: string
  description: string
}

export const profile: Profile = {
  name: "Ryuki Tobita",
  role: "フルスタックデベロッパー",
  avatar: { src: "/profile/avatar.webp", alt: "Ryuki Tobita のアイコン。キャップをかぶりピースサインをするイラスト" },
  summary: [
    "フロントエンドからバックエンド、クラウド基盤までを一人で通して作るフルスタックデベロッパーです。",
    "2025 年からはフリーランスとして、Web アプリケーションの開発、検索の改善、AI 連携機能の開発などに携わっています。",
    "最近は Claude Code などの AI エージェントを組み合わせて、アプリやツールを速く確実に作るための仕組みづくりに力を入れています。",
  ],
}

export const profileLinks: readonly ProfileLink[] = [
  { label: "GitHub", href: "https://github.com/reeschan" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/ryuki-tobita-890802228/" },
]

// 概要以外のタブを、タブと同じ順に案内する
export const pageGuides: readonly PageGuide[] = [
  { href: "/career", description: "これまでの勤務先とフリーランスでの参画案件を、タイムラインで新しい順に並べています。" },
  { href: "/skills", description: "フロントエンド・バックエンド・AWS などのスキルを、5 段階のレーダーチャートで見られます。" },
  { href: "/works", description: "自作のアプリやツールを、アーキテクチャ図と説明付きで紹介しています。" },
  { href: "/now", description: "いま取り組んでいることや、開発で得たナレッジをブログ風の記事で書いています。" },
  { href: "/chat", description: "職務経歴について、AI に質問できます。" },
  { href: "/theme", description: "背景の 3D シーンを選べます。" },
]
