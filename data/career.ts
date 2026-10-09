// /career の内容。経歴を更新するときはこのファイルだけを書き換える

export type CareerEntryType = "work" | "education" | "freelance" | "milestone"

// 参画案件
export interface Engagement {
  client: string
  period?: string
  summary: string
  points: string[]
  tech?: string[]
}

export interface CareerEntry {
  type: CareerEntryType
  title: string
  subtitle: string
  description?: string
  startDate: string
  endDate?: string
  ongoing?: boolean
  engagements?: Engagement[]
}

// 新しい順に並べる
export const careerData: CareerEntry[] = [
  {
    type: "freelance",
    title: "フリーランス",
    subtitle: "個人事業主",
    description: "Web アプリケーション開発を中心に、フロントエンドからクラウド基盤、検索・AI 連携まで一貫して担当。",
    startDate: "2025年03月",
    ongoing: true,
    engagements: [
      {
        client: "Forgers",
        // TODO: 参画期間 (period) と使用技術 (tech) を記入する
        summary: "VR・3D モデルを扱うプロジェクトでの Web アプリケーション開発。",
        // TODO: 担当内容 (points) を記入する
        points: [],
      },
      {
        client: "Stract",
        // TODO: 参画期間 (period) と使用技術 (tech) を記入する
        summary: "Plug アプリの開発。",
        points: ["検索機能の改善", "AI 連携機能の開発", "UI 刷新プロジェクトへの参画"],
      },
    ],
  },
  {
    type: "work",
    title: "東京海上日動システムズ株式会社",
    subtitle: "正社員",
    description: "デジタルイノベーション開発部にて、アジャイル・スクラム開発をメインとした東京海上グループのシステム内製開発に従事",
    startDate: "2022年04月",
    endDate: "2024年12月",
  },
  {
    type: "work",
    title: "株式会社網屋",
    subtitle: "正社員",
    description: "自社セキュリティパッケージ製品 ALog Converter の開発に従事し、 フロントエンド開発をメインとして機能要望に沿って開発",
    startDate: "2018年08月",
    endDate: "2022年03月",
  },
]
