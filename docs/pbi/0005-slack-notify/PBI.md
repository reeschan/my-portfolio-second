# PBI-0005 /now の投稿・更新と AI チャットへの質問を Slack に通知する

- 状態: 進行中
- 起票日: 2026-10-09
- 依頼者: リポジトリの持ち主
- 作業記録: [WORK.md](WORK.md)
- 関連 ADR: [0018](../../adr/0018-slack-notify-decorator.md)

## 背景・目的

/now に記事を投稿・更新したときや、訪問者が AI チャットで質問したときに、持ち主が Slack の特定のチャンネルで気づけるようにしたい。
認証やエラーの扱いと同じく、通知もデコレータで API に付ける。

## やること

- Slack へ通知を送る部品 (`lib/slack/notify.ts`) を作る。送り先は環境変数 `SLACK_WEBHOOK_URL` の Incoming Webhook
- 成功した API のあとに通知するデコレータ (`decorator/with-slack-notify.ts`) を作る
- `POST /api/now`・`PUT /api/now/[id]`・`POST /api/chat` をそのデコレータで包む

## やらないこと

- DELETE の通知
- Bot トークンでの送信、チャンネルの切り替え、スレッドへの返信
- 通知の失敗の再送

## 受け入れ条件

| # | 条件 | 確かめ方 |
| --- | --- | --- |
| 1 | `SLACK_WEBHOOK_URL` が未設定なら何も送らず、API の動きは変わらない | test/lib/slack/notify.test.ts、test/decorator/with-slack-notify.test.ts、既存の route.test.ts |
| 2 | /now の記事を POST・PUT で保存できたら、題名・本文の抜粋・/now へのリンクを送る | test/app/api/now/route.test.ts、test/app/api/now/[id]/route.test.ts |
| 3 | 認証・入力・保存先の失敗 (2xx 以外) では送らない | 同上、test/decorator/with-slack-notify.test.ts |
| 4 | AI チャットが回答を返したら、最新の質問だけを送る。回答・履歴・IP は送らない | test/app/api/chat/route.test.ts |
| 5 | 送るのはレスポンスを返したあと (`after`) で、Slack の失敗で API が失敗しない | test/decorator/with-slack-notify.test.ts |
| 6 | 利用者が書いた文字列でメンション (`<!channel>` など) が飛ばない。Webhook の URL をログに出さない | test/lib/slack/notify.test.ts、test/app/api/now/route.test.ts |
| 7 | テスト・E2E から本物の Slack を呼ばない | fetch のモック、playwright.config.ts の `SLACK_WEBHOOK_URL: ""` |
