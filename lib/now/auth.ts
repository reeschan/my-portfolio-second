import type { BearerAuthOptions } from "@/decorator/with-bearer-auth"

// /now の記事を書き換える API (POST / PUT / DELETE) の認証の設定。withBearerAuth に渡す
export const nowWriteAuth: BearerAuthOptions = { tokenEnv: "NOW_POST_TOKEN", realm: "now" }
