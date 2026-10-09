// /now ページの固定の内容。記事そのものは POST /api/now で投稿し、保存先 (lib/now/store.ts) から読む (PBI-0004)
// 参考: https://nownownow.com/about

export type NowData = {
  // 拠点 (空文字なら表示しない)
  location: string
  // 仕事の受付状況など。null なら表示しない
  availability: string | null
}

export const now: NowData = {
  // TODO: 拠点を記入する
  location: "",
  availability: null,
}
