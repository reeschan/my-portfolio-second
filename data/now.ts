// /now ページの内容。更新するときはこのファイルだけを書き換える。
// 参考: https://nownownow.com/about

export type NowSection = {
  heading: string
  items: string[]
}

export type NowData = {
  // 最終更新日 (ISO 形式: YYYY-MM-DD)
  lastUpdated: string
  // 拠点 (空文字なら表示しない)
  location: string
  sections: NowSection[]
  // 仕事の受付状況など。null なら表示しない
  availability: string | null
}

export const now: NowData = {
  // TODO: 内容を書いたら更新日を記入する (現在はページ作成日)
  lastUpdated: "2026-09-23",
  // TODO: 拠点を記入する
  location: "",
  // TODO: 取り組んでいることをセクションごとに記入する
  // 例: { heading: "仕事", items: ["...", "..."] }
  sections: [],
  availability: null,
}
