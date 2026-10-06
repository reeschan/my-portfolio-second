// "YYYY-MM-DD" を「YYYY年M月D日」に整形する。
// Date を経由するとサーバーとブラウザのタイムゾーン差で日付がずれるため、文字列から組み立てる
export function formatJapaneseDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return iso
  const [, year, month, day] = match
  return `${Number(year)}年${Number(month)}月${Number(day)}日`
}
