// API まわりのエラー。下の層は投げるだけにして、利用者に見せる文言とステータスは上位 (Route Handler・画面) が決める (ADR 0017)

// Route Handler から投げると、withErrorHandling がこのステータスと文言のレスポンスにする
export class HttpError extends Error {
  constructor(
    readonly status: number,
    // 利用者に見せる文言。レスポンスの { error } に入る
    message: string,
    readonly options: {
      // { error } と一緒に返す項目 (例: 入力検証の詳細)
      details?: Record<string, unknown>
      headers?: HeadersInit
    } = {},
  ) {
    super(message)
    this.name = "HttpError"
  }
}

// apiFetch で呼んだ先が失敗した (エラーのステータス・タイムアウト・通信できない)
export class ApiError extends Error {
  // 呼んだ先が返した本文の先頭 (ログ用。利用者には見せない)
  readonly responseBody: string | null

  constructor(
    // どこを呼んだか (ログ用)
    readonly service: string,
    // 呼んだ先のステータス。通信できなかった・時間切れなら null
    readonly status: number | null,
    // 呼んだ先が { error: string } で返した文言。自前の API の文言を画面に出すときに使う
    readonly publicMessage: string | null,
    options?: { cause?: unknown; detail?: string; responseBody?: string },
  ) {
    const reason = status === null ? (options?.detail ?? "no response") : `status ${status}`
    super(`${service} request failed (${reason})`, { cause: options?.cause })
    this.name = "ApiError"
    this.responseBody = options?.responseBody ?? null
  }
}

// 画面に出す文言を選ぶ。自前の API が返した文言があればそれを、なければ呼び出し側が決めた文言を使う
export function userMessageOf(error: unknown, fallback: string): string {
  return error instanceof ApiError && error.publicMessage ? error.publicMessage : fallback
}
