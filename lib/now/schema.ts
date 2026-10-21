import { z } from "zod"
import { ImageContentType } from "@/lib/now/image-inspect"

// /now の投稿 (POST /api/now、PUT /api/now/[id]) が受け取る値の形。検証と型を 1 か所にまとめる (ADR 0013)

const maxTitleLength = 120
// Markdown の本文。Redis の 1 値に収まり、モーダルで読み切れる長さを上限にする
const maxBodyLength = 20000

export const nowPostInputSchema = z.object({
  title: z.string().trim().min(1).max(maxTitleLength),
  body: z.string().trim().min(1).max(maxBodyLength),
  // 公開日時。省略したら、新規は受け付けた時刻、更新は元の公開日時のままにする。過去の出来事をあとから書けるよう任意の日時を許す
  publishedAt: z.iso.datetime({ offset: true }).optional(),
})

export type NowPostInput = z.infer<typeof nowPostInputSchema>

// 記事の画像の対応表の 1 件 (docs/specs/now-post-images.md の「記事のデータ」)。本文はファイル名で参照し、描くときにここで URL を引く
export const nowPostImageSchema = z.object({
  // 送られたファイル名 (英数字・-・_・. だけ)
  name: z.string().regex(/^[A-Za-z0-9._-]+$/),
  url: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  contentType: z.enum(Object.values(ImageContentType)),
  bytes: z.number().int().nonnegative(),
  // 中身の SHA-256 (16 進の全桁)
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
})

export type NowPostImage = z.infer<typeof nowPostImageSchema>

export type NowPost = {
  id: string
  title: string
  // Markdown (GFM)。```mermaid のコードブロックは図として描く
  body: string
  // ISO 8601 (UTC)
  publishedAt: string
  // 最後に PUT で更新した日時 (ISO 8601、UTC)。一度も更新していなければない
  updatedAt?: string
  // 画像の対応表。画像を扱う前に投稿した記事には無い
  images?: NowPostImage[]
}

// 保存先から読んだ値の検証。壊れた値が 1 件あっても一覧全体を落とさないよう、呼び出し側で捨てる
export const nowPostSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  body: z.string(),
  publishedAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }).optional(),
  images: z.array(nowPostImageSchema).optional(),
})

// 新しい順に並べる。同じ日時なら id で順序を固定し、表示が揺れないようにする
export function sortNewestFirst(posts: NowPost[]): NowPost[] {
  return [...posts].sort((a, b) => {
    const diff = Date.parse(b.publishedAt) - Date.parse(a.publishedAt)
    return diff !== 0 ? diff : b.id.localeCompare(a.id)
  })
}
