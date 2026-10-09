# WORK-0005 /now の投稿・更新と AI チャットへの質問を Slack に通知する

PBI: [PBI.md](PBI.md)

## 計画

- [x] `lib/slack/notify.ts` (`notifySlack`・`escapeSlackText`・`truncateForSlack`) — test/lib/slack/notify.test.ts
- [x] `decorator/with-slack-notify.ts` — test/decorator/with-slack-notify.test.ts
- [x] 通知の中身 `lib/now/notify.ts`・`lib/chat/notify.ts` と、POST / PUT / チャットへの適用 — 各 route.test.ts
- [x] `.env.example`・playwright.config.ts・README・AGENTS.md の更新

## ADR が要る判断

- [ADR 0018](../../adr/0018-slack-notify-decorator.md): 外部サービス (Slack) の採用と、通知をデコレータで付ける形

## 記録

- 2026-10-09: 送り方は Incoming Webhook にした。Bot トークンより設定が少なく、チャンネルが URL に固定されるので誤送信しにくい
- 2026-10-09: 送信は `after()` の中で行う。await して送ると応答が遅れ、await しないと Vercel で関数が止まって送られないことがあるため
- 2026-10-09: レスポンスを返したあとは本文が読まれて `clone()` できないので、通知の中身の組み立てだけは返す前に済ませる
- 2026-10-09: チャットは訪問者の最新の質問だけを送る。回答・履歴・IP は送らない (持ち主が質問に気づければ足りるため)
- 2026-10-09: `SLACK_WEBHOOK_URL` が未設定ならデコレータは何もしない (リクエストの複製もしない)。既存のテストと E2E は通知と無関係に動く
- 2026-10-09: DELETE の通知は頼まれていないので見送った。要るならデコレータを足すだけで済む

## 検証

```
pnpm commit-gate
```
