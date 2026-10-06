// /works の内容。作品を足すときはこのファイルに 1 件足す
export type Work = {
  id: string
  title: string
  description: string
  image: { src: string; alt: string }
  // 詳細ダイアログがある作品だけ true (components/features/works/work-detail-dialog.tsx)
  hasDetail: boolean
}

export const works: Work[] = [
  {
    id: "portfolio",
    title: "ポートフォリオサイト",
    description:
      "Next.jsとReactを使用して構築された個人ポートフォリオサイト。スキルをレーダーチャートで表示、経歴をタイムラインで表示など、データ駆動の視覚化を重視したデザイン。",
    image: { src: "/placeholder.svg?height=400&width=600", alt: "ポートフォリオサイト" },
    hasDetail: true,
  },
  {
    id: "project-2",
    title: "プロジェクト2",
    description: "プロジェクト2の説明文をここに記載します。",
    image: { src: "/placeholder.svg?height=400&width=600", alt: "プロジェクト2" },
    hasDetail: false,
  },
]
