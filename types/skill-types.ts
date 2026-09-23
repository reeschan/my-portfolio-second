// スキルカテゴリの型定義
export type SkillCategory = {
  name: string;
  shortName?: string; // モバイル用の短縮名
  skills: {
    name: string;
    shortName?: string; // モバイル用の短縮名
    level: number; // 1-5のレベル
    fullMark?: number;
  }[];
};
