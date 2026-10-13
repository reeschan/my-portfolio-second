import { z } from "zod"

// お問い合わせの入力。画面 (フォーム) と API の両方で同じものを使い、決まりがずれないようにする
// 長さは zod の数え方 (UTF-16) で数える。絵文字などで「文字数」と少しずれるが、目安として十分なので厳密にしない
export const contactLimits = { nameMax: 100, emailMax: 254, messageMin: 10, messageMax: 2000 } as const

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(contactLimits.nameMax),
  // 前後の空白を除いてから形式を確かめるため、trim した結果を z.email() に渡す
  email: z.string().trim().max(contactLimits.emailMax).pipe(z.email()),
  message: z.string().trim().min(contactLimits.messageMin).max(contactLimits.messageMax),
  // ハニーポット。人には見えない入力欄で、bot が埋めたら捨てる。人は触らないので省略できる
  website: z.string().max(200).optional(),
})

export type ContactInput = z.infer<typeof contactSchema>
