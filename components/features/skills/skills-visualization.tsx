"use client"

import { BulletList, Callout } from "@/components/common"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { skillsByLocale } from "@/data/localized"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useLocale, useMessages } from "@/lib/i18n/locale-context"
import type { SkillCategory, SkillCategoryId } from "@/types/skill-types"
import { SkillRadar } from "./skill-radar"

// カテゴリ別に出すタブ。「その他」は概要のレーダーに含めているのでタブにはしない
const tabCategoryIds: readonly SkillCategoryId[] = ["frontend", "backend", "aws"]

// data/ のカテゴリを id で引く。言語や並び順に依存せず、消えていたら空のタブを出す前に描画時の例外で気づけるようにする
function categoryOf(categories: SkillCategory[], id: SkillCategoryId) {
  const category = categories.find((c) => c.id === id)
  if (!category) throw new Error(`スキルのカテゴリ「${id}」が data/skills.ts にありません`)
  return category
}

export function SkillsVisualization() {
  const isMobile = useMediaQuery("(max-width: 640px)")
  const messages = useMessages().skills
  const { skillCategories, radarData, certifications } = skillsByLocale[useLocale()]
  const categoryTabs = tabCategoryIds.map((id) => categoryOf(skillCategories, id))

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">{messages.overviewTab}</TabsTrigger>
        {categoryTabs.map((category) => (
          <TabsTrigger key={category.id} value={category.id}>
            {isMobile ? category.shortName : category.name}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="overview" className="mt-6">
        <SkillRadar title={isMobile ? messages.overviewTitleShort : messages.overviewTitle} data={radarData}>
          <Callout title={messages.certifications}>
            <BulletList items={certifications} className="space-y-1" />
          </Callout>
        </SkillRadar>
      </TabsContent>

      {categoryTabs.map((category) => (
        <TabsContent key={category.id} value={category.id} className="mt-6">
          <SkillRadar
            title={isMobile ? category.name : messages.categoryTitle(category.name)}
            data={category.skills}
            dataKey="level"
            angleDataKey="name"
          />
        </TabsContent>
      ))}
    </Tabs>
  )
}
