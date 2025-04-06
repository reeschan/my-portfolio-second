// スキルカテゴリの型定義
export type SkillCategory = {
  name: string;
  skills: {
    name: string;
    level: number; // 1-5のレベル
    fullMark?: number;
  }[];
};
