import { createHash, timingSafeEqual } from "node:crypto"

// Route Handler の形。第 2 引数は動的ルートなら { params }、そうでなければ使わない
type RouteHandler<C> = (request: Request, context: C) => Response | Promise<Response>

export type BearerAuthOptions = {
  // トークンを入れておく環境変数の名前。リクエストのたびに読む (デプロイ後に差し替えても効くように)
  tokenEnv: string
  // 401 の WWW-Authenticate に載せる名前
  realm: string
}

export type BearerAuthResult = "ok" | "unconfigured" | "unauthorized"

// 認証が要る API の Route Handler を包むデコレータ。
// Authorization: Bearer <トークン> が環境変数の値と一致したときだけ、包んだ処理を呼ぶ (ADR 0016)
//   export const POST = withBearerAuth({ tokenEnv: "NOW_POST_TOKEN", realm: "now" }, async (request) => { ... })
export function withBearerAuth<C>(options: BearerAuthOptions, handler: RouteHandler<C>): RouteHandler<C> {
  return (request, context) => {
    const result = authorizeBearer(request, process.env[options.tokenEnv])
    if (result === "unconfigured") {
      return Response.json({ error: "この機能は現在ご利用いただけません。" }, { status: 503 })
    }
    if (result === "unauthorized") {
      return Response.json(
        { error: "認証に失敗しました。" },
        { status: 401, headers: { "WWW-Authenticate": `Bearer realm="${options.realm}"` } },
      )
    }
    return handler(request, context)
  }
}

// トークンが未設定なら誰も通さない (空文字と一致させない)
export function authorizeBearer(request: Request, token: string | undefined): BearerAuthResult {
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
