# PBI-0020 RSS に /now の記事を載せる

- 状態: 進行中
- 起票日: 2026-10-13
- 依頼者: リポジトリの持ち主
- 作業記録: [WORK.md](WORK.md)
- 関連 ADR: なし ([0015](../../adr/0015-now-posts-storage-and-markdown.md) の保存先と、[0029](../../adr/0029-site-url-and-seo-metadata.md) の本番の URL を使う)

## 背景・目的

- `/rss.xml` は `<channel>` の見出しだけを返し、`<item>` を 1 件も出していなかった。全ページの右上に RSS のボタンがあるのに、購読しても何も届かない
- `lastBuildDate` がリクエストのたびの現在時刻で、記事が増えていなくても更新ありに見えた
- 記事ごとのページはなく、記事は /now のダイアログで読む。フィードから記事へ飛ぶ先が要る

## やること

- /now の記事を新しい順に `<item>` にする (題名・リンク・guid・公開日時・本文の抜粋)
- `lastBuildDate` を最新の記事の更新日時にする
- `/now?post=<id>` で開くと、その記事のダイアログを開いた状態で出す。閉じたら `?post=` を消す
- 全ページの `<head>` に `link rel="alternate" type="application/rss+xml"` を出す

## やらないこと

- 記事ごとのページ (`/now/[id]`) を作ること
- 本文の全文 (`content:encoded`) をフィードに入れること
- Atom や JSON Feed を出すこと

## 受け入れ条件

| # | 条件 | 確かめ方 |
| --- | --- | --- |
| 1 | 投稿した記事が `/rss.xml` の item に載り、リンクが `/now?post=<id>` を指す | e2e/now.spec.ts (@api-contract)、test/lib/now/feed.test.ts |
| 2 | 題名や本文の `&` `<` などで XML が崩れない | test/lib/now/feed.test.ts |
| 3 | 記事がないときと保存先が落ちたときも、item のない正しいフィードを返す | test/lib/now/feed.test.ts、e2e/smoke.spec.ts (@smoke) |
| 4 | `/now?post=<id>` でその記事のダイアログが開き、閉じると URL が `/now` に戻る。知らない id なら一覧だけ出す | e2e/now.spec.ts (@interaction) |
| 5 | どのページもフィードの場所を `link rel="alternate"` で示す | e2e/now.spec.ts (@smoke) |
| 6 | lint・型・ユニット・書式・ビルドと必須観点の穴の検査が通る | `pnpm commit-gate` |
