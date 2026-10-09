# 0018. Slack への通知は Incoming Webhook で送り、Route Handler のデコレータで付ける

- 状態: 提案中
- 日付: 2026-10-09
- 関連: [ADR 0016](0016-test-directory-and-auth-decorator.md)、[ADR 0017](0017-api-client-and-error-decorator.md)、[PBI-0005](../pbi/0005-slack-notify/PBI.md)

## 背景

- /now の記事の投稿・更新 (POST / PUT) と、AI チャットへの質問を、持ち主が Slack の特定のチャンネルで気づけるようにしたい
- 認証 (`withBearerAuth`) とエラーの扱い (`withErrorHandling`) はデコレータにしてある。通知も同じ形で付け外しできるようにしたい
- 通知は付け足しの機能で、通知の失敗や遅れで API の結果を変えてはいけない

## 決定

- **送り方は Slack の Incoming Webhook**。URL を環境変数 `SLACK_WEBHOOK_URL` に入れる。投稿先のチャンネルは Webhook を作るときに決まる
  - 未設定なら通知しない (開発・テスト・E2E では空にする)
  - URL は秘密として扱う。ログにも出さない
- **送る部品は `lib/slack/notify.ts` の `notifySlack(message)`**
  - `apiFetch` を通す (上限 5 秒)。失敗しても例外を投げず、ログに残して `false` を返す
  - 利用者が書いた文字列は `escapeSlackText` で `& < >` を実体参照にしてから埋め込む (`<!channel>` などのメンションやリンクにさせない)
- **付けるのは `decorator/with-slack-notify.ts` の `withSlackNotify(build, handler)`**
  - 包んだ処理が 2xx を返したときだけ、`build({ request, response, context })` で中身を組み立てる。`null` なら送らない
  - 送るのは Next.js の `after()` の中 (レスポンスを返したあと)。利用者を待たせない
  - 組み立ては返す前に済ませる (返したあとはレスポンスの本文が読まれ、`clone()` できなくなるため)。組み立ての失敗はログに残して送らないだけにする
  - 並びは `withErrorHandling(withSlackNotify(build, withBearerAuth(auth, handler)))`。認証で弾いたもの・投げたものは通知しない
- **中身は機能ごとに `lib/<機能>/notify.ts` で組み立てる**
  - /now: 保存した記事 (レスポンス) の題名・本文の先頭 300 字・/now へのリンク
  - チャット: 訪問者の最新の質問だけ (先頭 300 字)。AI の回答・会話の履歴・IP アドレスは送らない

## 検討した選択肢

| 選択肢 | 良い点 | 悪い点 |
| --- | --- | --- |
| **Incoming Webhook** | URL 1 つで済む。チャンネルが URL に固定され、誤って別のチャンネルに送らない | チャンネルを変えるには Webhook を作り直す |
| Bot トークン + `chat.postMessage` | チャンネルを環境変数で変えられる。スレッドにもできる | Slack アプリの権限 (scope) と 2 つの値の管理が要る。今の用途には過剰 |
| Route Handler の中で直接 `notifySlack` を呼ぶ | 単純 | ルートごとに成功の判定・`after` の付け忘れが起き、認証・エラーと付け方がそろわない |
| `after` を使わず await して送る | テストが単純 | Slack が遅いと API の応答も遅れる |
| `after` を使わず await せずに送る | 応答は遅れない | Vercel ではレスポンスのあとに関数が止まり、送られないことがある |

## 結果

- 通知したい API はデコレータを 1 つ足し、`lib/<機能>/notify.ts` に組み立てを書くだけで済む
- チャットへの質問 (訪問者の入力) が Slack に残る。訪問者を特定できる値は送らないが、質問文に個人情報が書かれていればそのまま届くことは受け入れる
- テストは `fetch` をモックし、`after` を `vi.mock("next/server", ...)` で差し替える (`test/decorator/with-slack-notify.test.ts`、`test/lib/slack/notify.test.ts`、各 `route.test.ts`)。E2E は `SLACK_WEBHOOK_URL` を空にして起動する
- 削除 (DELETE) はまだ通知しない。要るなら同じデコレータを付ける
