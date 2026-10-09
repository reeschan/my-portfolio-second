import { z } from "zod"

// チャット API が外から受け取る値の形。手書きの絞り込みをやめ、検証と型を 1 か所にまとめる (ADR 0013)

const maxMessages = 20
// 訪問者の入力は画面側と同じ 1000 字まで。AI の過去の回答は長くなるため、弾かずに切り詰めて送る
const maxUserMessageLength = 1000
const maxAssistantMessageLength = 4000

const messageSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("user"), content: z.string().min(1).max(maxUserMessageLength) }),
  z.object({
    role: z.literal("assistant"),
    content: z
      .string()
      .min(1)
      .transform((s) => s.slice(0, maxAssistantMessageLength)),
  }),
])

// 直近の 20 件だけを検証して送る。古い発言は捨てるので、形が崩れていても弾かない
export const chatRequestSchema = z
  .object({ messages: z.array(z.unknown()).min(1) })
  .transform((body) => body.messages.slice(-maxMessages))
  .pipe(z.array(messageSchema))
  .refine((messages) => messages.at(-1)?.role === "user", { message: "最後の発言は訪問者のものにする" })

// OpenAI 互換の SSE の 1 イベント。使う項目だけを見て、それ以外は無視する
export const sseChunkSchema = z.object({
  choices: z
    .array(
      z.object({
        delta: z.object({ content: z.string().nullish() }).nullish(),
        finish_reason: z.string().nullish(),
      }),
    )
    .optional(),
})
