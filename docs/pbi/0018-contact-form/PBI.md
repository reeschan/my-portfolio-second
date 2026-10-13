# PBI-0018 お問い合わせフォームを足し、お問い合わせを Slack に届ける

- 状態: 進行中
- 起票日: 2026-10-13
- 依頼者: リポジトリの持ち主
- 作業記録: [WORK.md](WORK.md)
- 関連 ADR: [0028](../../adr/0028-contact-form-slack-only.md)
- 仕様: [docs/specs/contact-form.md](../../specs/contact-form.md) (ユーザーストーリーとテストの決定はこちらが正)

## 背景・目的

サイトを見た採用担当や発注者が、持ち主に連絡する手段がサイトの中に無い。持ち主のメールアドレスを載せるとスパムの宛先になる。
アドレスを公開せずに、閲覧者からの連絡 (お問い合わせ) を確実に受け取れるようにする。

## やること

- タブ「お問い合わせ」(`/contact`) を「チャット」と「テーマ」のあいだに足す (日本語・英語)
- 名前・メールアドレス・本文のフォームと、受付・失敗の表示
- `POST /api/contact`: 入力の検証、IP ごとのレート制限 (1 時間 5 回)、ハニーポット、Slack への送信。送れたときだけ受け付けたと返す
- チャットの IP ごとのレート制限を共通の場所に移し、枠ごとに上限を持てるようにする
- 外部モック観点の対象に `/contact` と `/api/contact` を足す

## やらないこと

- メールの送信と、送り主への自動返信
- お問い合わせの保存・一覧
- CAPTCHA、インスタンスをまたぐレート制限
- 持ち主のメールアドレスの掲載 (ページにもリポジトリにも書かない)

## 受け入れ条件

| #   | 条件                                                                                                                                         | 確かめ方                                                                         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | 正しい入力で 200 が返り、Slack に 1 回送られ、中身に名前・メールアドレス・本文があり、IP アドレスが無く、`<!channel>` などが無害化されている | test/app/api/contact/route.test.ts (api-contract・external-mock)                 |
| 2   | 必須の欠け・形式の誤り・長さの超過で 400、Slack に送られない                                                                                 | test/app/api/contact/route.test.ts                                               |
| 3   | ハニーポットが埋まっていると成功を返し、Slack に送られない                                                                                   | test/app/api/contact/route.test.ts                                               |
| 4   | 同じ IP の 6 回目が 429、別の IP は通る。チャットとは別に数える                                                                              | test/app/api/contact/route.test.ts、test/lib/rate-limit.test.ts                  |
| 5   | Slack が失敗すると 502、`SLACK_WEBHOOK_URL` が無いと 503                                                                                     | test/app/api/contact/route.test.ts                                               |
| 6   | 送ると受付の案内が出て、「別のお問い合わせを送る」で空のフォームに戻る                                                                       | e2e/contact.spec.ts (@interaction・@external-mock)                               |
| 7   | API が失敗するとエラーが出て、入力が残る                                                                                                     | e2e/contact.spec.ts                                                              |
| 8   | 英語に切り替えると文言が英語になる                                                                                                           | e2e/contact.spec.ts                                                              |
| 9   | タブの並び・smoke・a11y が通り、ページに持ち主のメールアドレスが無い                                                                         | e2e/navigation.spec.ts、e2e/smoke.spec.ts、e2e/a11y.spec.ts、e2e/contact.spec.ts |
| 10  | チャットのレート制限の振る舞いが変わらない                                                                                                   | test/app/api/chat/route.test.ts、test/lib/rate-limit.test.ts                     |
| 11  | lint・型・ユニット・書式・ビルドと、必須観点の穴の検査が通る                                                                                 | `pnpm check`、`pnpm test:coverage-map -- --check`                                |
