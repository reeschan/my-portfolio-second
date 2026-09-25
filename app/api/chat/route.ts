import { createRedactingStream } from "@/lib/chat/redact"
import { isRateLimited } from "@/lib/chat/rate-limit"
import { buildSystemPrompt } from "@/lib/chat/system-prompt"
import type { ChatMessage } from "@/types/chat-types"

export const runtime = "nodejs"
// Vercel Hobby プランの上限は 60 秒
export const maxDuration = 60

const baseUrl = process.env.MOONSHOT_BASE_URL ?? "https://api.moonshot.ai/v1"
const model = process.env.MOONSHOT_MODEL ?? "kimi-k2.6"

const maxMessages = 20
const maxMessageLength = 1000

function parseMessages(body: unknown): ChatMessage[] | null {
  if (typeof body !== "object" || body === null || !("messages" in body)) return null
  const { messages } = body as { messages: unknown }
  if (!Array.isArray(messages) || messages.length === 0) return null

  const parsed: ChatMessage[] = []
  for (const m of messages.slice(-maxMessages)) {
    if (typeof m !== "object" || m === null) return null
    const { role, content } = m as Record<string, unknown>
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null
    if (content.length === 0 || content.length > maxMessageLength) return null
    parsed.push({ role, content })
  }

  return parsed.at(-1)?.role === "user" ? parsed : null
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
        const data = line.trim()
        if (!data.startsWith("data:")) continue
        const payload = data.slice(5).trim()
        if (payload === "[DONE]") continue

        try {
          const choice = JSON.parse(payload).choices?.[0]
          const content = choice?.delta?.content
          if (typeof content === "string" && content) controller.enqueue(content)
          if (choice?.finish_reason === "length") {
            controller.enqueue("\n\n（回答が長くなったため、ここで区切りました。続きは質問を絞ってお尋ねください）")
          }
        } catch {
          // 途中で壊れた行は無視する
        }
      }
    },
  })
}

export async function POST(request: Request) {
  const apiKey = process.env.MOONSHOT_API_KEY
  if (!apiKey) {
    return Response.json({ error: "チャット機能は現在ご利用いただけません。" }, { status: 503 })
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  if (isRateLimited(ip)) {
    return Response.json({ error: "リクエストが多すぎます。しばらく時間をおいてからお試しください。" }, { status: 429 })
  }

  const messages = parseMessages(await request.json().catch(() => null))
  if (!messages) {
    return Response.json({ error: "メッセージの形式が正しくありません。" }, { status: 400 })
  }

  const upstream = await fetch(`${baseUrl}/chat/completions`, {
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
    signal: request.signal,
  }).catch(() => null)

  if (!upstream?.ok || !upstream.body) {
    if (upstream) console.error("Kimi API error", upstream.status, await upstream.text().catch(() => ""))
    return Response.json({ error: "回答の生成に失敗しました。時間をおいて再度お試しください。" }, { status: 502 })
  }

  const stream = upstream.body
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
}
