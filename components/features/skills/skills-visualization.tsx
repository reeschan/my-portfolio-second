"use client"

import { BulletList, Callout } from "@/components/common"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { certifications, radarData, skillCategories } from "@/data/skills"
import { useMediaQuery } from "@/hooks/use-media-query"
import { SkillRadar } from "./skill-radar"

// data/ のカテゴリを名前で引く。並び順に依存せず、名前が変わったら空のタブを出す前にビルド時の描画で気づけるよう例外にする
function categoryOf(name: string) {
  const category = skillCategories.find((c) => c.name === name)
  if (!category) throw new Error(`スキルのカテゴリ「${name}」が data/skills.ts にありません`)
  return category
}

// カテゴリ別のタブ。label はスマホ幅で shortLabel に切り替える
const categoryTabs = [
  { value: "frontend", category: categoryOf("フロントエンド"), label: "フロントエンド", shortLabel: "FE" },
  { value: "backend", category: categoryOf("バックエンド"), label: "バックエンド", shortLabel: "BE" },
  { value: "aws", category: categoryOf("AWS"), label: "AWS", shortLabel: "AWS" },
] as const

export function SkillsVisualization() {
  const isMobile = useMediaQuery("(max-width: 640px)")

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">概要</TabsTrigger>
        {categoryTabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {isMobile ? tab.shortLabel : tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="overview" className="mt-6">
        <SkillRadar title={isMobile ? "スキル概要" : "スキルレーダー (5段階評価)"} data={radarData}>
          <Callout title="資格ハイライト">
            <BulletList items={certifications} className="space-y-1" />
          </Callout>
        </SkillRadar>
      </TabsContent>

      {categoryTabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className="mt-6">
          <SkillRadar
            title={isMobile ? tab.label : `${tab.label}スキル (5段階評価)`}
            data={tab.category.skills}
            dataKey="level"
            angleDataKey="name"
          />
        </TabsContent>
      ))}
    </Tabs>
  )
}
