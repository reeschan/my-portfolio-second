// スキルカテゴリの型定義
export type SkillCategoryId = "frontend" | "backend" | "aws" | "other"

export type SkillCategory = {
  // 言語によらない識別子。タブとカテゴリの対応に使う
  id: SkillCategoryId
  name: string
  shortName?: string // モバイル用の短縮名
  skills: {
    name: string
    shortName?: string // モバイル用の短縮名
    level: number // 1-5のレベル
    fullMark?: number
  }[]
}
