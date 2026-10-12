// @perspectives content
// @routes /overview /career /skills /works
import { describe, expect, it } from "vitest"
import { en } from "@/data/messages/en"
import { ja } from "@/data/messages/ja"
import { careerByLocale, overviewByLocale, skillsByLocale, worksByLocale } from "@/data/localized"

// 英語版は日本語版の訳なので、並び・数・言語によらない値 (href・レベル・技術・図) が日本語版と同じであることを確かめる
describe("英語版の表示データ", () => {
  it("概要: 案内の並びが日本語版と同じ", () => {
    expect(overviewByLocale.en.pageGuides.map((g) => g.href)).toEqual(overviewByLocale.ja.pageGuides.map((g) => g.href))
    expect(overviewByLocale.en.profile.summary).toHaveLength(overviewByLocale.ja.profile.summary.length)
  })

  it("経歴: 種類・継続中・参画先が日本語版と同じ並び", () => {
    const shape = (entries: typeof careerByLocale.ja) =>
      entries.map((e) => ({ type: e.type, ongoing: e.ongoing, clients: e.engagements?.map((g) => g.client), hasEnd: !!e.endDate }))
    expect(shape(careerByLocale.en)).toEqual(shape(careerByLocale.ja))
  })

  it("スキル: カテゴリ・レベル・資格の数が日本語版と同じ", () => {
    const levels = (locale: "ja" | "en") => skillsByLocale[locale].skillCategories.map((c) => [c.id, c.skills.map((s) => s.level)])
    expect(levels("en")).toEqual(levels("ja"))
    expect(skillsByLocale.en.radarData.map((d) => d.value)).toEqual(skillsByLocale.ja.radarData.map((d) => d.value))
    expect(skillsByLocale.en.certifications).toHaveLength(skillsByLocale.ja.certifications.length)
  })

  it("ワーク: すべての作品に英語の文章があり、技術・リポジトリ・図は日本語版と同じ", () => {
    expect(worksByLocale.en.map((w) => w.id)).toEqual(worksByLocale.ja.map((w) => w.id))
    worksByLocale.en.forEach((work, i) => {
      const original = worksByLocale.ja[i]!
      expect(work.title === original.title && work.description === original.description, `${work.id} が訳されていない`).toBe(false)
      expect(work.body).not.toBe(original.body)
      expect(work.architecture.alt).not.toBe(original.architecture.alt)
      expect({ tech: work.tech, repository: work.repository, light: work.architecture.light, dark: work.architecture.dark }).toEqual({
        tech: original.tech,
        repository: original.repository,
        light: original.architecture.light,
        dark: original.architecture.dark,
      })
    })
  })
})

describe("画面の文言", () => {
  it("チャットの質問の候補は日本語版と同じ数", () => {
    expect(en.chat.suggestions).toHaveLength(ja.chat.suggestions.length)
  })
})
