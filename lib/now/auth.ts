import type { BearerAuthOptions } from "@/decorator/with-bearer-auth"
import type { ErrorMessages } from "@/decorator/with-error-handling"

// /now の記事を書き換える API (POST / PUT / DELETE) の認証の設定。withBearerAuth に渡す
export const nowWriteAuth: BearerAuthOptions = { tokenEnv: "NOW_POST_TOKEN", realm: "now" }

// 同じ API のエラーの文言。withErrorHandling と入力検証に渡す
export const nowWriteErrors = {
  invalid: "投稿の形式が正しくありません。",
  upstream: "投稿の保存先とのやりとりに失敗しました。",
} satisfies ErrorMessages & { invalid: string }
