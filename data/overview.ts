// /overview の内容。自己紹介・外部のプロフィールへのリンク・各ページの案内をここにまとめる (PBI-0013)

export type ProfileLink = {
  label: string
  href: string
}

export type PageGuide = {
  // lib/navigation.ts の href と同じ値。タブの表示名はそちらから引く
  href: string
  description: string
}

export const profile = {
  name: "Ryuki Tobita",
  role: "フルスタックデベロッパー",
  // 段落ごとに 1 要素
  summary: [
    "フロントエンドからバックエンド、クラウド基盤までを一人で通して作るフルスタックデベロッパーです。",
    "2025 年からはフリーランスとして、Web アプリケーションの開発、検索の改善、AI 連携機能の開発などに携わっています。",
    "最近は Claude Code などの AI エージェントを組み合わせて、アプリやツールを速く確実に作るための仕組みづくりに力を入れています。",
  ],
} as const

// TODO: LinkedIn のプロフィール URL を持ち主に確認して足す
export const profileLinks: readonly ProfileLink[] = [{ label: "GitHub", href: "https://github.com/reeschan" }]

// 概要以外のタブを、タブと同じ順に案内する
export const pageGuides: readonly PageGuide[] = [
  { href: "/career", description: "これまでの勤務先とフリーランスでの参画案件を、タイムラインで新しい順に並べています。" },
  { href: "/skills", description: "フロントエンド・バックエンド・AWS などのスキルを、5 段階のレーダーチャートで見られます。" },
  { href: "/works", description: "自作のアプリやツールを、アーキテクチャ図と説明付きで紹介しています。" },
  { href: "/now", description: "いま取り組んでいることや、開発で得たナレッジをブログ風の記事で書いています。" },
  { href: "/chat", description: "職務経歴について、AI に質問できます。" },
  { href: "/theme", description: "背景の 3D シーンを選べます。" },
]
