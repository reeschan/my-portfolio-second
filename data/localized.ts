// data/ の表示データを言語ごとに引く入口 (PBI-0014)。日本語は data/*.ts、英語は data/en/*.ts が正本
import type { Locale } from "@/lib/i18n/config"
import { careerData, type CareerEntry } from "./career"
import { careerDataEn } from "./en/career"
import { pageGuidesEn, profileEn } from "./en/overview"
import { certificationsEn, radarDataEn, skillCategoriesEn } from "./en/skills"
import { worksEn } from "./en/works"
import { pageGuides, profile, type PageGuide, type Profile } from "./overview"
import { certifications, radarData, skillCategories, type RadarDatum } from "./skills"
import type { SkillCategory } from "@/types/skill-types"
import { works, type Work } from "./works"

export type OverviewContent = { profile: Profile; pageGuides: readonly PageGuide[] }

export type SkillsContent = {
  skillCategories: SkillCategory[]
  radarData: RadarDatum[]
  certifications: readonly string[]
}

// 外部のプロフィールへのリンクは言語によらず同じものを出すので、ここには含めない
export const overviewByLocale: Record<Locale, OverviewContent> = {
  ja: { profile, pageGuides },
  en: { profile: profileEn, pageGuides: pageGuidesEn },
}

export const careerByLocale: Record<Locale, CareerEntry[]> = { ja: careerData, en: careerDataEn }

export const skillsByLocale: Record<Locale, SkillsContent> = {
  ja: { skillCategories, radarData, certifications },
  en: { skillCategories: skillCategoriesEn, radarData: radarDataEn, certifications: certificationsEn },
}

export const worksByLocale: Record<Locale, Work[]> = { ja: works, en: worksEn }
