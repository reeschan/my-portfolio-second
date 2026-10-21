import { nowPostPath } from "../lib/now/feed"
import { createNowPost, expect, routes, test, uniqueTitle } from "./fixtures"

// 応答のセキュリティヘッダー (PBI-006、ADR 0033)。ヘッダーは next.config.ts の headers() が付ける。
// ページを開かず request.get で応答だけを見るので、存在しないパスでも console の 404 は出ない。
// ヘッダー名は小文字で返る (HTTP の仕様) ので、小文字で引く

// 3 種類の応答のどれにも付いているべきヘッダーと値。値まで確かめるのは、
// ヘッダーがあるだけで中身が緩い設定 (例: referrer-policy が unsafe-url) を見逃さないため
const securityHeaders = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "content-security-policy": "frame-ancestors 'none'",
} as const

function expectSecurityHeaders(headers: Record<string, string>): void {
  for (const [name, value] of Object.entries(securityHeaders)) {
    expect(headers[name], `${name} が無いか値が違う`).toBe(value)
  }
}

test.describe("セキュリティヘッダー: すべての応答", () => {
  test("固定のページの応答に付く", { tag: ["@seo"], annotation: routes("/overview") }, async ({ request }) => {
    const res = await request.get("/overview")
    expect(res.status()).toBe(200)
    expectSecurityHeaders(res.headers())
  })

  test("記事ページの応答に付く", { tag: ["@seo"], annotation: routes("/now/[id]") }, async ({ request }) => {
    const { id } = await createNowPost(request, { title: uniqueTitle("ヘッダーの記事"), body: "記事の本文です。" })

    const res = await request.get(nowPostPath(id))
    expect(res.status()).toBe(200)
    expectSecurityHeaders(res.headers())
  })

  test(
    "存在しないパスの 404 の応答にも付く",
    // 404 はカバレッジの表に行が無いので、対象ルートはトップとして記録する (PBI-006 の補足)
    { tag: ["@seo"], annotation: routes("/") },
    async ({ request }) => {
      // 前の実行の応答がキャッシュに残らないよう、毎回違うパスにする
      const res = await request.get(`/no-such-page-${crypto.randomUUID()}`)
      expect(res.status()).toBe(404)
      expectSecurityHeaders(res.headers())
    },
  )
})
