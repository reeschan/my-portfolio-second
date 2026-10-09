import { ApiError, HttpError } from "@/lib/api/errors"

type RouteHandler<C> = (request: Request, context: C) => Response | Promise<Response>

export type ErrorMessages = {
  // 呼んだ先 (apiFetch) が失敗したときに利用者へ返す文言。502 で返す
  upstream?: string
  // 想定していないエラーのときの文言。500 で返す
  unexpected?: string
}

const defaultMessages: Required<ErrorMessages> = {
  upstream: "外部のサービスとのやりとりに失敗しました。時間をおいて再度お試しください。",
  unexpected: "サーバーでエラーが発生しました。",
}

// Route Handler を包み、中で投げられたエラーをレスポンスにするデコレータ (ADR 0017)
// - HttpError: そのステータスと文言で返す
// - ApiError (apiFetch の失敗): ログに残し、502 と messages.upstream を返す。呼んだ先の文言は利用者に見せない
// - それ以外: ログに残し、500 と messages.unexpected を返す
// 他のデコレータ (withBearerAuth など) が投げる HttpError も受け取れるよう、いちばん外側に付ける
//   export const POST = withErrorHandling(withBearerAuth(auth, handler), { upstream: "..." })
export function withErrorHandling<C>(handler: RouteHandler<C>, messages: ErrorMessages = {}): RouteHandler<C> {
  const { upstream, unexpected } = { ...defaultMessages, ...messages }

  return async (request, context) => {
    try {
      return await handler(request, context)
    } catch (error) {
      if (error instanceof HttpError) {
        const { details, headers } = error.options
        return Response.json({ error: error.message, ...details }, { status: error.status, headers })
      }
      const label = `${request.method} ${new URL(request.url).pathname}`
      if (error instanceof ApiError) {
        console.error(`${label}: ${error.message}`, error.responseBody ?? error.cause ?? "")
        return Response.json({ error: upstream }, { status: 502 })
      }
      console.error(`${label}: unexpected error`, error)
      return Response.json({ error: unexpected }, { status: 500 })
    }
  }
}
