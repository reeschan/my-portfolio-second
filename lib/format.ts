const jstDateFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "long",
  day: "numeric",
})

// ISO 8601 の日時を日本時間の「YYYY年M月D日」にする。
// タイムゾーンを固定するので、サーバーとブラウザで日付がずれない (ハイドレーションの不一致を防ぐ)
export function formatJapaneseDateTime(iso: string): string {
  const time = Date.parse(iso)
  return Number.isNaN(time) ? iso : jstDateFormatter.format(time)
}
