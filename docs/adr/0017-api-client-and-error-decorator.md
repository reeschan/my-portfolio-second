# 0017. API の呼び出しは apiFetch に集め、エラーはデコレータで上位がレスポンスにする

- 状態: 提案中
- 日付: 2026-10-09
- 関連: [ADR 0016](0016-test-directory-and-auth-decorator.md)、[ADR 0015](0015-now-posts-storage-and-markdown.md)、[PBI-0004](../pbi/0004-now-posts/PBI.md)

## 背景

- API の呼び出し (`fetch`) が、Upstash の保存先・チャット API の Moonshot・チャット画面・eval に散らばっていた。待つ時間の上限がなく、失敗の扱いも場所ごとに違った (PR のレビューで、Upstash が応答しないと /now が止まると指摘された)
- Route Handler が失敗のたびに `Response.json({ error }, { status })` を組み立てていて、下の層 (保存先) が利用者向けの文言を返す作りも混ざっていた

## 決定

- **API を呼ぶときは必ず `lib/api/client.ts` の `apiFetch` (`apiFetchJson`) を通す**。外部 (Upstash・Moonshot) も、画面から自前の API (`/api/chat`) を呼ぶときも同じ
  - 待つ時間に上限を付ける (既定 10 秒。`timeoutMs` で変える。`false` で上限なし)
  - 失敗 (エラーのステータス・時間切れ・通信できない) は `ApiError` を投げる。`status`、相手が `{ error: string }` で返した文言 (`publicMessage`)、ログ用の本文の先頭 (`responseBody`) を持つ
  - サーバーとブラウザの両方で動く (Node の API を使わない)
- **エラーは下の層では投げるだけにし、文言とステータスは上位が決める**
  - Route Handler は失敗を `HttpError(status, 文言)` で投げる (`lib/api/errors.ts`)。入力検証は `readJsonBody` (`lib/api/request.ts`) が 400 の `HttpError` を投げる
  - `decorator/with-error-handling.ts` の `withErrorHandling(handler, { upstream, unexpected })` が投げられたものを受け取り、レスポンスにする
    - `HttpError` → そのステータスと文言
    - `ApiError` → 502 と、そのルートが決めた `upstream` の文言 (呼んだ先の文言は見せず、ログに残す)
    - それ以外 → 500 と `unexpected` の文言 (ログに残す)
  - `withBearerAuth` も通さないときは `HttpError` (401 / 503) を投げる。`withErrorHandling` をいちばん外側に付ける
    `export const POST = withErrorHandling(withBearerAuth(auth, handler), { upstream: "..." })`
  - 画面は `ApiError` を受け取り、`userMessageOf(error, 画面の文言)` で出す文言を決める。ページ (/now) は保存先の失敗を受け取り、一覧の代わりに知らせを出す

## 検討した選択肢

| 選択肢 | 良い点 | 悪い点 |
| --- | --- | --- |
| **apiFetch + HttpError + withErrorHandling** | 上限時間・失敗の形・ログが 1 か所で決まる。ルートは成功の流れだけを書ける | 投げる例外の種類を覚える必要がある。`withErrorHandling` を付け忘れると Next の 500 になる |
| ルートごとに try/catch して Response を返す (これまで) | 単純 | 文言とログの出し方がばらつき、上限時間の付け忘れが起きる |
| ky などの HTTP クライアントを入れる | リトライなどが揃っている | 依存が増える。必要なのは上限時間と失敗の形だけ |
| Result 型 (`{ ok, error }`) で返す | 例外を使わない | 呼び出しのたびに分岐が要り、デコレータで一括して扱えない |

## 結果

- Upstash は 5 秒、Moonshot は 55 秒 (関数の上限 60 秒の手前)、チャット画面はサーバーに任せて上限なし、eval は 180 秒で打ち切る
- 新しい Route Handler は `withErrorHandling` で包み、失敗は `HttpError` を投げる。テストは `test/decorator/with-error-handling.test.ts`、`test/lib/api/*.test.ts`
- `fetch` を直接書かない。ユニットテストは引き続き `fetch` をモックする (apiFetch の下で呼ばれる)
