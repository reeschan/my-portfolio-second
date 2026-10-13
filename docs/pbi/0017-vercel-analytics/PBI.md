# PBI-0017 Vercel Analytics で閲覧数を計測する

- 状態: 進行中
- 起票日: 2026-10-13
- 依頼者: リポジトリの持ち主
- 作業記録: [WORK.md](WORK.md)
- 関連 ADR: [0027](../../adr/0027-vercel-analytics.md)

## 背景・目的

公開しているポートフォリオがどれくらい見られているか、どのページが読まれているかが分からない。Vercel にデプロイしているので、Vercel Web Analytics でページビューと訪問者数を見られるようにしたい。

## やること

- `@vercel/analytics` を入れ、全ページ共通のレイアウトに `<Analytics />` を置く
- 計測は Vercel 上 (本番・プレビュー) でだけ動かす。手元の dev と CI の本番ビルドでは計測スクリプトを読み込まない

## やらないこと

- Speed Insights (表示速度の計測) の導入
- 独自イベント (チャットの送信数など) の計測
- Vercel のダッシュボードでの Web Analytics の有効化 (持ち主が操作する)

## 受け入れ条件

| # | 条件 | 確かめ方 |
| --- | --- | --- |
| 1 | Vercel 上 (`VERCEL=1`) でだけ計測を有効にする | test/lib/analytics.test.ts |
| 2 | Vercel 以外ではページを移っても計測スクリプトを読み込まず、console エラーも出ない | e2e/smoke.spec.ts (@smoke) |
| 3 | lint・型・ユニット・書式・ビルドと必須観点の穴の検査が通る | `pnpm commit-gate` |
| 4 | Vercel のダッシュボードの Analytics にページビューが出る | デプロイ後に持ち主が目で確かめる |
