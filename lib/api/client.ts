import { ApiError } from "./errors"

// API を呼ぶときは必ずこれを通す (外部の Upstash・Moonshot も、画面からの自前の API も)。ADR 0017
// - 待つ時間に上限を付ける (相手が応答しないと、ページや関数がタイムアウトまで止まるため)
// - 失敗 (エラーのステータス・時間切れ・通信できない) は ApiError を投げる。文言は呼び出し側が決める
// サーバーとブラウザの両方で動くよう、Node の API は使わない

export type ApiFetchInit = RequestInit & {
  // ログに出す呼び出し先の名前
  service: string
  // 待つ上限 (ミリ秒)。ストリームの読み終わりまで含む。false なら上限なし (呼び出し元の signal に任せる)
  timeoutMs?: number | false
}

const defaultTimeoutMs = 10_000

export async function apiFetch(input: string | URL, { service, timeoutMs = defaultTimeoutMs, ...init }: ApiFetchInit): Promise<Response> {
  const signals = [init.signal, timeoutMs === false ? null : AbortSignal.timeout(timeoutMs)].filter((s): s is AbortSignal => !!s)
  const signal = signals.length > 1 ? AbortSignal.any(signals) : signals[0]

  let res: Response
  try {
    res = await fetch(input, { ...init, signal })
  } catch (error) {
    const detail = error instanceof Error && error.name === "TimeoutError" ? "timeout" : "network error"
    throw new ApiError(service, null, null, { cause: error, detail })
  }

  if (!res.ok) {
    const responseBody = await res.text().catch(() => "")
    throw new ApiError(service, res.status, publicMessageOf(responseBody), { responseBody: responseBody.slice(0, 500) })
  }
  return res
}

// JSON を返す API を呼び、本文を返す
export async function apiFetchJson(input: string | URL, init: ApiFetchInit): Promise<unknown> {
  const res = await apiFetch(input, init)
  return res.json()
}

// 失敗したレスポンスの本文から { error: string } を取り出す。形が違えば null
function publicMessageOf(body: string): string | null {
  let data: unknown
  try {
    data = JSON.parse(body)
  } catch {
    return null
  }
  if (typeof data === "object" && data !== null && "error" in data && typeof data.error === "string") return data.error
  return null
}
