import { z } from "zod"

// /now の投稿 (POST /api/now) が受け取る値の形。検証と型を 1 か所にまとめる (ADR 0013)

const maxTitleLength = 120
// Markdown の本文。Redis の 1 値に収まり、モーダルで読み切れる長さを上限にする
const maxBodyLength = 20000

export const nowPostInputSchema = z.object({
  title: z.string().trim().min(1).max(maxTitleLength),
  body: z.string().trim().min(1).max(maxBodyLength),
  // 公開日時。省略したら受け付けた時刻にする。過去の出来事をあとから書けるよう任意の日時を許す
  publishedAt: z.iso.datetime({ offset: true }).optional(),
})

export type NowPostInput = z.infer<typeof nowPostInputSchema>

export type NowPost = {
  id: string
  title: string
  // Markdown (GFM)。```mermaid のコードブロックは図として描く
  body: string
  // ISO 8601 (UTC)
  publishedAt: string
}

// 保存先から読んだ値の検証。壊れた値が 1 件あっても一覧全体を落とさないよう、呼び出し側で捨てる
export const nowPostSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  body: z.string(),
  publishedAt: z.iso.datetime({ offset: true }),
})

// 新しい順に並べる。同じ日時なら id で順序を固定し、表示が揺れないようにする
export function sortNewestFirst(posts: NowPost[]): NowPost[] {
  return [...posts].sort((a, b) => {
    const diff = Date.parse(b.publishedAt) - Date.parse(a.publishedAt)
    return diff !== 0 ? diff : b.id.localeCompare(a.id)
  })
}
