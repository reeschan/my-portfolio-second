# PBI-0023 /now の記事ごとのページを作り、記事の内容を検索エンジンに載せる

- 状態: 進行中
- 起票日: 2026-10-16
- 依頼者: リポジトリの持ち主
- 作業記録: [WORK.md](WORK.md)
- 関連 ADR: [0030](../../adr/0030-now-post-pages.md)

## 背景・目的

/now の記事は一覧の上のダイアログでしか読めず、記事ごとの URL がない。ダイアログはサーバーで描かれないので、検索エンジンは記事の本文を読めない。記事を投稿したら、その内容が検索結果に出るようにしたい。

## やること

- 記事ごとのページ `/now/<id>` を作り、本文をサーバーで描く。知らない id は 404
- 記事ごとの title・description・canonical・OGP (`type: article`、公開日・更新日) と、`BlogPosting` の JSON-LD を出す
- sitemap に記事を載せる (`lastModified` 付き)
- RSS の item のリンクを `/now/<id>` にする
- 一覧のカードを記事のページへのリンクにし、ダイアログをやめる。`/now?post=<id>` は `/now/<id>` にリダイレクトする
- `/now/<id>` でもタブの「Now」を選んだ状態にする

## やらないこと

- 記事ごとの OGP 画像 (日本語のフォントの同梱が要るため。サイト共通の画像のまま)
- 題名から作る slug の URL
- 記事の英語版

## 受け入れ条件

| # | 条件 | 確かめ方 |
| --- | --- | --- |
| 1 | `/now/<id>` を開くと、題名 (h1)・公開日・本文が出て、HTML に本文の文字が入っている | e2e/now-post-page.spec.ts (@smoke) |
| 2 | 記事のページに、記事ごとの title・description・canonical (`/now/<id>`)・`og:type=article` と公開日がある | e2e/now-post-page.spec.ts (@smoke) |
| 3 | 記事のページに `BlogPosting` の JSON-LD があり、`<` がエスケープされている | test/lib/now/structured-data.test.ts、e2e/now-post-page.spec.ts |
| 4 | 知らない id は 404 | e2e/now-post-page.spec.ts (@interaction) |
| 5 | 一覧のカードを押すと記事のページに移り、タブの「Now」が選ばれている | e2e/now.spec.ts (@interaction)、e2e/now-post-page.spec.ts |
| 6 | `/now?post=<id>` は `/now/<id>` に移る | e2e/now.spec.ts (@interaction) |
| 7 | RSS の item のリンクが `/now/<id>` を指す | test/lib/now/feed.test.ts、e2e/now.spec.ts (@api-contract) |
| 8 | sitemap に記事の URL と `lastModified` が載り、保存先が落ちても固定のページは返る | test/app/sitemap.test.ts |
| 9 | 必須の観点に穴がない | `pnpm test:coverage-map -- --check` |
