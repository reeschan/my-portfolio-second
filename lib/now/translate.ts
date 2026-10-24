import remarkGfm from "remark-gfm"
import remarkParse from "remark-parse"
import { unified } from "unified"
import { visit } from "unist-util-visit"
import { z } from "zod"
import { apiFetchJson } from "@/lib/api/client"
import { ApiError } from "@/lib/api/errors"
import { imageRefsOf } from "@/lib/now/post-images"
import { nowPostInputSchema } from "@/lib/now/schema"

// 記事の日本語の題名と本文を、Moonshot (Kimi。チャットと同じ API) で英語にする部品。
// 訳でコード・図・画像の参照が壊れていないかを訳したあとに検査し、通らない訳は失敗として返す。投げない

export type NowTranslationResult =
  { ok: true; title: string; body: string } | { ok: false; reason: "not-configured" } | { ok: false; reason: "failed"; detail: string }

// 環境変数の名前と既定値はチャット (app/api/chat/route.ts) と揃える
const defaultBaseUrl = "https://api.moonshot.ai/v1"
const defaultModel = "kimi-k2.6"
// 関数の上限 (300 秒) より手前で打ち切る
const timeoutMs = 240_000
// 長い本文 (上限 20000 字) の訳が収まる大きさ
const maxTokens = 32_000

const systemPrompt = [
  "あなたは日本語の技術ブログ記事を英語にする翻訳者です。",
  "- 日本語の Markdown の記事を、自然な英語にする",
  "- 一人称の書き手 (Ryuki Tobita) の文体を保つ",
  "- 見出しの段・リスト・表・リンクの構造を保つ",
  "- コードブロック・インラインコード・URL・画像のパスは一字も変えない (```mermaid の図の中身も変えない)",
  "- 画像の代替テキストは英語にする",
  '- 出力は {"title": "...", "body": "..."} の JSON だけにする。前後に説明や ``` を付けない',
].join("\n")

type CodeBlock = { lang: string | null; value: string }

function codeBlocksOf(markdown: string): CodeBlock[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown)
  const blocks: CodeBlock[] = []
  visit(tree, "code", (node) => {
    blocks.push({ lang: node.lang ?? null, value: node.value })
  })
  return blocks
}

function failed(detail: string): NowTranslationResult {
  return { ok: false, reason: "failed", detail }
}

// Kimi の応答 (OpenAI 互換) の形。content は {"title","body"} の JSON の文字列
const kimiResponseSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string() }), finish_reason: z.string().nullish() })),
})
const translationSchema = z.object({ title: z.string(), body: z.string() })

// 応答から題名と本文を取り出す。取り出せなければ理由の文字列を返す
function parseTranslation(data: unknown): { title: string; body: string } | string {
  const response = kimiResponseSchema.safeParse(data)
  if (!response.success) return "unexpected response shape"
  const choice = response.data.choices[0]
  if (!choice) return "no choices"
  if (choice.finish_reason === "length") return "truncated (finish_reason: length)"
  let content: unknown
  try {
    content = JSON.parse(choice.message.content)
  } catch {
    return "content is not JSON"
  }
  const translation = translationSchema.safeParse(content)
  return translation.success ? translation.data : "title or body is missing"
}

// 訳が元の画像の参照とコードブロックを保っているか、題名・本文の制約に合うかを調べる。通らなければ理由を返す
function inspectTranslation(source: string, translated: { title: string; body: string }): string | null {
  const limits = nowPostInputSchema.pick({ title: true, body: true }).safeParse(translated)
  if (!limits.success) return "title or body does not fit the post limits"
  const imageSrcs = (markdown: string) => JSON.stringify(imageRefsOf(markdown).map((ref) => ref.src))
  if (imageSrcs(source) !== imageSrcs(translated.body)) return "image references changed"
  if (JSON.stringify(codeBlocksOf(source)) !== JSON.stringify(codeBlocksOf(translated.body))) return "code blocks changed"
  return null
}

// 日本語の題名と本文を英語にする。設定が無ければ not-configured、訳せない・検査に通らないときは failed (投げない)
export async function translateNowPost(
  input: { title: string; body: string },
  env: NodeJS.ProcessEnv = process.env,
): Promise<NowTranslationResult> {
  const apiKey = env.MOONSHOT_API_KEY
  if (!apiKey) return { ok: false, reason: "not-configured" }
  const baseUrl = env.MOONSHOT_BASE_URL || defaultBaseUrl

  let data: unknown
  try {
    data = await apiFetchJson(`${baseUrl}/chat/completions`, {
      service: "Moonshot",
      timeoutMs,
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: env.MOONSHOT_MODEL || defaultModel,
        stream: false,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify({ title: input.title, body: input.body }) },
        ],
      }),
    })
  } catch (error) {
    if (error instanceof ApiError) return failed(error.message)
    return failed(error instanceof Error ? error.message : "unknown error")
  }

  const translated = parseTranslation(data)
  if (typeof translated === "string") return failed(translated)
  const problem = inspectTranslation(input.body, translated)
  if (problem) return failed(problem)
  return { ok: true, title: translated.title.trim(), body: translated.body.trim() }
}
