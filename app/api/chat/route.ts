import { withErrorHandling } from "@/decorator/with-error-handling"
import { withSlackNotify } from "@/decorator/with-slack-notify"
import { apiFetch } from "@/lib/api/client"
import { ApiError, HttpError } from "@/lib/api/errors"
import { chatNotification } from "@/lib/chat/notify"
import { readJsonBody } from "@/lib/api/request"
import { createRedactingStream } from "@/lib/chat/redact"
import { isRateLimited } from "@/lib/chat/rate-limit"
import { chatRequestSchema, sseChunkSchema } from "@/lib/chat/schema"
import { buildSystemPrompt } from "@/lib/chat/system-prompt"
import type { ChatMessage } from "@/types/chat-types"

export const runtime = "nodejs"
// Vercel Hobby プランの上限は 60 秒
export const maxDuration = 60

const baseUrl = process.env.MOONSHOT_BASE_URL ?? "https://api.moonshot.ai/v1"
const model = process.env.MOONSHOT_MODEL ?? "kimi-k2.6"

const truncatedNotice = "\n\n（回答が長くなったため、ここで区切りました。続きは質問を絞ってお尋ねください）"

// SSE の 1 行から JSON の部分を取り出す。data 行でないもの・終わりの印は null
function payloadOfSseLine(line: string): string | null {
  const data = line.trim()
  if (!data.startsWith("data:")) return null
  const payload = data.slice(5).trim()
  return payload === "[DONE]" ? null : payload
}

// 1 イベントから、画面に流す文字列を取り出す。本文 (delta.content) と、上限で切れたときの断り書きだけを返す
function textOfSsePayload(payload: string): string {
  let json: unknown
  try {
    json = JSON.parse(payload)
  } catch {
    // 途中で壊れた行は無視する
    return ""
  }
  const choice = sseChunkSchema.safeParse(json).data?.choices?.[0]
  const content = choice?.delta?.content ?? ""
  return choice?.finish_reason === "length" ? content + truncatedNotice : content
}

// OpenAI 互換の SSE から回答本文 (delta.content) だけを取り出す。思考過程 (reasoning_content) は返さない
function createSseContentStream() {
  let buffer = ""

  return new TransformStream<string, string>({
    transform(chunk, controller) {
      buffer += chunk
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""

      for (const line of lines) {
        const payload = payloadOfSseLine(line)
        const text = payload === null ? "" : textOfSsePayload(payload)
        if (text) controller.enqueue(text)
      }
    },
  })
}

// 上流 (Moonshot) に会話を渡し、SSE の本文を返す。失敗は apiFetch が ApiError を投げる
async function requestCompletion(messages: ChatMessage[], apiKey: string, signal: AbortSignal) {
  const upstream = await apiFetch(`${baseUrl}/chat/completions`, {
    service: "Moonshot",
    // 回答をストリームで流しきるまで含めて、関数の上限 (maxDuration) より手前で打ち切る
    timeoutMs: 55_000,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      stream: true,
      // 思考モデルは思考過程もこの上限に含まれるため、途中で回答が切れないよう余裕を持たせる
      max_tokens: 8192,
      messages: [{ role: "system", content: await buildSystemPrompt() }, ...messages],
    }),
    signal,
  })
  if (!upstream.body) throw new ApiError("Moonshot", upstream.status, null, { detail: "empty body" })
  return upstream.body
}

// 回答を返し始めたら、質問が来たことを Slack に知らせる (SLACK_WEBHOOK_URL を設定したときだけ)
export const POST = withErrorHandling(
  withSlackNotify(chatNotification, async (request) => {
    const apiKey = process.env.MOONSHOT_API_KEY
    if (!apiKey) throw new HttpError(503, "チャット機能は現在ご利用いただけません。")

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
    if (isRateLimited(ip)) throw new HttpError(429, "リクエストが多すぎます。しばらく時間をおいてからお試しください。")

    const messages = await readJsonBody(request, chatRequestSchema, "メッセージの形式が正しくありません。")
    const upstream = await requestCompletion(messages, apiKey, request.signal)

    const stream = upstream
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(createSseContentStream())
      .pipeThrough(createRedactingStream())
      .pipeThrough(new TextEncoderStream())

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    })
  }),
  { upstream: "回答の生成に失敗しました。時間をおいて再度お試しください。" },
)
