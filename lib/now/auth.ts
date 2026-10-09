import { createHash, timingSafeEqual } from "node:crypto"

export type AuthResult = "ok" | "unconfigured" | "unauthorized"

// 投稿 API の認可。Authorization: Bearer <NOW_POST_TOKEN> と一致したときだけ通す
// トークンが未設定なら誰も投稿できないようにする (空文字と一致させない)
export function authorizeNowPost(request: Request, token = process.env.NOW_POST_TOKEN): AuthResult {
  if (!token) return "unconfigured"
  const match = /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization") ?? "")
  const given = match?.[1]?.trim()
  return given && safeEqual(given, token) ? "ok" : "unauthorized"
}

// 一致するまでの時間からトークンを推測されないよう、長さをそろえたハッシュ同士を定数時間で比べる
function safeEqual(a: string, b: string): boolean {
  const digest = (s: string) => createHash("sha256").update(s).digest()
  return timingSafeEqual(digest(a), digest(b))
}
