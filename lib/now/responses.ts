import { getNowStore, type NowPostStore } from "./store"

// 書き込み API が使う保存先。本番で Redis が未設定なら、保存先の代わりに返す 503 を渡す
export function requireNowStore(): { store: NowPostStore } | { error: Response } {
  const store = getNowStore()
  if (store) return { store }
  return { error: Response.json({ error: "投稿の保存先が設定されていません。" }, { status: 503 }) }
}

// 投稿の検証に落ちたときの 400
export function invalidPostResponse(issues: unknown) {
  return Response.json({ error: "投稿の形式が正しくありません。", issues }, { status: 400 })
}

// 保存先の読み書きに失敗したときの 502。原因はログにだけ残す
export function storeFailedResponse(action: string, error: unknown) {
  console.error(`Failed to ${action} now post`, error)
  return Response.json({ error: "投稿の保存先とのやりとりに失敗しました。" }, { status: 502 })
}

export const postNotFoundResponse = () => Response.json({ error: "投稿が見つかりません。" }, { status: 404 })
