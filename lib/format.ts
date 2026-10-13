import type { Locale } from "@/lib/i18n/config"

// 日付はどの言語でも日本時間で数える (記事の日付が見る言語で変わらないようにする)
const dateFormatters: Record<Locale, Intl.DateTimeFormat> = {
  ja: new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "long", day: "numeric" }),
  en: new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tokyo", year: "numeric", month: "long", day: "numeric" }),
}

// ISO 8601 の日時を日本時間の日付にする (ja は「YYYY年M月D日」、en は「October 9, 2026」)。
// タイムゾーンを固定するので、サーバーとブラウザで日付がずれない (ハイドレーションの不一致を防ぐ)
export function formatDate(iso: string, locale: Locale): string {
  const time = Date.parse(iso)
  return Number.isNaN(time) ? iso : dateFormatters[locale].format(time)
}

export function formatJapaneseDateTime(iso: string): string {
  return formatDate(iso, "ja")
}
