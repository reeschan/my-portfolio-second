import { authorizeNowPost } from "./auth"
import { getNowStore, type NowPostStore } from "./store"

// 投稿 API (POST /api/now, DELETE /api/now/[id]) に共通する前段。認可と保存先の用意をして、
// 通れば保存先を、だめならそのまま返すレスポンスを返す
export function prepareNowWrite(request: Request): { store: NowPostStore } | { error: Response } {
  const auth = authorizeNowPost(request)
  if (auth === "unconfigured") {
    return { error: Response.json({ error: "投稿機能は現在ご利用いただけません。" }, { status: 503 }) }
  }
  if (auth === "unauthorized") {
    return {
      error: Response.json({ error: "認証に失敗しました。" }, { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="now"' } }),
    }
  }

  const store = getNowStore()
  if (!store) {
    return { error: Response.json({ error: "投稿の保存先が設定されていません。" }, { status: 503 }) }
  }
  return { store }
}
