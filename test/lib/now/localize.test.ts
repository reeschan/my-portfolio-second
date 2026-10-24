// @perspectives content
// @routes /now /now/[id]
import { describe, expect, it } from "vitest"
import { localizeNowPost, NowPostNotice } from "@/lib/now/localize"
import type { NowPostEnglish } from "@/lib/now/schema"

// 日本語の記事と、その記事に付きうる英語版 (なし・自動訳・持ち主の訳) の 3 通り
const japanese = { title: "日本語の題名", body: "日本語の本文" }
const updatedAt = "2026-10-24T00:00:00.000Z"
const autoEnglish: NowPostEnglish = { title: "Machine title", body: "Machine body", source: "auto", updatedAt }
const ownerEnglish: NowPostEnglish = { title: "Owner title", body: "Owner body", source: "owner", updatedAt }

describe("localizeNowPost", () => {
  // 表示言語 (ja / en) × 英語版 (なし / 自動訳 / 持ち主の訳) の 6 通りを、出す題名・本文・言語・断り書きまで確かめる
  it.each([
    {
      name: "日本語で英語版が無いときは、日本語をそのまま出す",
      locale: "ja" as const,
      en: undefined,
      expected: { ...japanese, lang: "ja", notice: null },
    },
    {
      name: "日本語で自動訳があるときも、日本語をそのまま出して断らない",
      locale: "ja" as const,
      en: autoEnglish,
      expected: { ...japanese, lang: "ja", notice: null },
    },
    {
      name: "日本語で持ち主の訳があるときも、日本語をそのまま出して断らない",
      locale: "ja" as const,
      en: ownerEnglish,
      expected: { ...japanese, lang: "ja", notice: null },
    },
    {
      name: "英語で英語版が無いときは、日本語のまま出して日本語のみと断る",
      locale: "en" as const,
      en: undefined,
      expected: { ...japanese, lang: "ja", notice: NowPostNotice.japaneseOnly },
    },
    {
      name: "英語で自動訳があるときは、英語版を出して自動訳と断る",
      locale: "en" as const,
      en: autoEnglish,
      expected: { title: autoEnglish.title, body: autoEnglish.body, lang: "en", notice: NowPostNotice.machineTranslated },
    },
    {
      name: "英語で持ち主の訳があるときは、英語版を出して断らない",
      locale: "en" as const,
      en: ownerEnglish,
      expected: { title: ownerEnglish.title, body: ownerEnglish.body, lang: "en", notice: null },
    },
  ])("$name", ({ locale, en, expected }) => {
    expect(localizeNowPost({ ...japanese, en }, locale)).toEqual(expected)
  })
})
