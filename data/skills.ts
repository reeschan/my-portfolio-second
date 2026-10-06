// /skills の内容。スキルや資格を更新するときはこのファイルだけを書き換える
import type { SkillCategory } from "@/types/skill-types"

// カテゴリ別のスキル (5 段階)。shortName はスマホ幅で使う短縮名
export const skillCategories: SkillCategory[] = [
  {
    name: "フロントエンド",
    shortName: "FE",
    skills: [
      { name: "TypeScript", shortName: "TS", level: 5 },
      { name: "JavaScript", shortName: "JS", level: 5 },
      { name: "React", shortName: "React", level: 5 },
      { name: "Vue.js", shortName: "Vue", level: 5 },
      { name: "HTML/CSS", shortName: "HTML/CSS", level: 5 },
      { name: "Knockout.js", shortName: "KO", level: 4 },
    ],
  },
  {
    name: "バックエンド",
    shortName: "BE",
    skills: [
      { name: "Node.js", shortName: "Node", level: 4 },
      { name: "C#", shortName: "C#", level: 4 },
      { name: "Python", shortName: "Py", level: 4 },
      { name: "Kotlin", shortName: "Kt", level: 3 },
      { name: "PostgreSQL", shortName: "Pg", level: 4 },
      { name: "SQL Server", shortName: "SQL", level: 3 },
    ],
  },
  {
    name: "AWS",
    shortName: "AWS",
    skills: [
      { name: "Lambda", shortName: "λ", level: 5 },
      { name: "ECS/Fargate", shortName: "ECS", level: 4 },
      { name: "CDK/CloudFormation", shortName: "CDK", level: 4 },
      { name: "DynamoDB/RDS", shortName: "DB", level: 4 },
      { name: "API Gateway", shortName: "API", level: 4 },
      { name: "S3/CloudFront", shortName: "S3/CF", level: 5 },
    ],
  },
  {
    name: "その他",
    shortName: "他",
    skills: [
      { name: "プロジェクト管理", shortName: "PJ", level: 4 },
      { name: "アーキテクチャ設計", shortName: "設計", level: 4 },
      { name: "DevOps", shortName: "DevOps", level: 4 },
      { name: "セキュリティ", shortName: "Sec", level: 4 },
    ],
  },
]

// メインスキルカテゴリ（レーダーチャート用 - 5段階評価）（短縮名を含む）
export const radarData = [
  { subject: "フロントエンド", shortSubject: "FE", value: 5, fullMark: 5 },
  { subject: "バックエンド", shortSubject: "BE", value: 4, fullMark: 5 },
  { subject: "クラウド(AWS)", shortSubject: "AWS", value: 5, fullMark: 5 },
  { subject: "プロジェクト管理", shortSubject: "PJ", value: 4, fullMark: 5 },
  { subject: "アーキテクチャ", shortSubject: "設計", value: 4, fullMark: 5 },
  { subject: "DevOps", shortSubject: "DevOps", value: 4, fullMark: 5 },
]

export const certifications = [
  "応用情報技術者",
  "AWS認定ソリューションアーキテクト - プロフェッショナル",
  "AWS認定DevOpsエンジニア - プロフェッショナル",
  "AWS認定セキュリティ - スペシャリティ",
  "AWS認定機械学習 - スペシャリティ",
  "その他AWS資格5つ保持",
] as const
