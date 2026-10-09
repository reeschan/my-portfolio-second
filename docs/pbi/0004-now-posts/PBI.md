# PBI-0004 /now をトークン付きの POST で投稿でき、カードとモーダルで読めるブログ風にする

- 状態: 進行中
- 起票日: 2026-10-09
- 依頼者: リポジトリの持ち主
- 作業記録: [WORK.md](WORK.md)
- 関連 ADR: [0015](../../adr/0015-now-posts-storage-and-markdown.md)

## 背景・目的

/now (直近やっていること) は `data/now.ts` を書き換えてデプロイしないと更新できない。
決まったトークンを `Authorization` ヘッダーに付けた POST で記事を足せるようにし、ブログのように新しい順のカードで並べ、押すと詳細が読めるようにしたい。
本文は Markdown で書き、図は Mermaid で描けるようにする。

## やること

- `POST /api/now` (`Authorization: Bearer <NOW_POST_TOKEN>`) で記事 (題名・Markdown の本文・任意の公開日時) を保存する
- 誤投稿を消せるよう `DELETE /api/now/[id]` を用意する
- /now に記事を公開日の新しい順でカードとして並べる (日付・題名・本文の抜粋)
- カードを押すと、背景が透ける半透明のモーダルで全文を読める
- 本文は Markdown (GFM: 表・チェックリスト・打ち消し線) と ` ```mermaid ` の図を描く

## やらないこと

- 画像の埋め込み・アップロード
- 管理画面 (投稿は curl などで API を叩く)
- 記事の編集 API (消して足し直す)
- 記事ごとの URL・RSS への反映

## 受け入れ条件

| # | 条件 | 確かめ方 |
| --- | --- | --- |
| 1 | 正しいトークンの POST だけが記事を保存し 201 を返す。違う・ないなら 401、サーバーのトークン未設定なら 503、形式違いは 400 | app/api/now/route.test.ts、lib/now/auth.test.ts (api-contract)、e2e/now.spec.ts「トークンなしの投稿」 |
| 2 | 投稿した記事が /now にカードで出て、日付と本文の抜粋が見える | e2e/now.spec.ts「投稿した記事がカードで出て」(@content @responsive)、lib/now/excerpt.test.ts |
| 3 | カードは公開日の新しい順に並ぶ | e2e/now.spec.ts「新しい順に並ぶ」(@content)、lib/now/store.test.ts |
| 4 | カードを押すと半透明のモーダルが開き、Markdown (見出し・チェックリスト・表・リンク) と Mermaid の図が描かれ、閉じられる | e2e/now.spec.ts「カードを押すとダイアログで」(@interaction @responsive) |
| 5 | 記事を消せる (204、ないものは 404、トークンなしは 401) | app/api/now/route.test.ts |
| 6 | 本番は Upstash Redis に保存し、E2E・ユニットは本物の Redis を呼ばない | lib/now/store.test.ts (fetch をモック)、playwright.config.ts の webServer の env |
| 7 | a11y の重大な違反がない | e2e/a11y.spec.ts (/now) |
