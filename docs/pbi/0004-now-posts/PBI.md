# PBI-0004 /now をトークン付きの POST で投稿でき、カードとモーダルで読めるブログ風にする

- 状態: 進行中
- 起票日: 2026-10-09
- 依頼者: リポジトリの持ち主
- 作業記録: [WORK.md](WORK.md)
- 関連 ADR: [0015](../../adr/0015-now-posts-storage-and-markdown.md)、[0016](../../adr/0016-test-directory-and-auth-decorator.md)

## 背景・目的

/now (直近やっていること) は `data/now.ts` を書き換えてデプロイしないと更新できない。
決まったトークンを `Authorization` ヘッダーに付けた POST で記事を足せるようにし、ブログのように新しい順のカードで並べ、押すと詳細が読めるようにしたい。
本文は Markdown で書き、図は Mermaid で描けるようにする。

## やること

- `POST /api/now` (`Authorization: Bearer <NOW_POST_TOKEN>`) で記事 (題名・Markdown の本文・任意の公開日時) を保存する
- あとから直せるよう `PUT /api/now/[id]` (書き換え) と `DELETE /api/now/[id]` (削除) を用意する
- 認証は `decorator/` のデコレータにまとめ、書き込み API はすべてそれで包む
- ユニットテストを `test/` に、ソースと同じ階層で置くようにする (既存のテストも移す)
- /now に記事を公開日の新しい順でカードとして並べる (日付・題名・本文の抜粋)
- カードを押すと、背景が透ける半透明のモーダルで全文を読める
- 本文は Markdown (GFM: 表・チェックリスト・打ち消し線) と ` ```mermaid ` の図を描く

## やらないこと

- 画像の埋め込み・アップロード
- 管理画面 (投稿は curl などで API を叩く)
- 記事ごとの URL・RSS への反映

## 受け入れ条件

| # | 条件 | 確かめ方 |
| --- | --- | --- |
| 1 | 正しいトークンの POST だけが記事を保存し 201 を返す。違う・ないなら 401、サーバーのトークン未設定なら 503、形式違いは 400 | test/app/api/now/route.test.ts、test/decorator/with-bearer-auth.test.ts (api-contract)、e2e/now.spec.ts「トークンなしの投稿」 |
| 2 | 投稿した記事が /now にカードで出て、日付と本文の抜粋が見える | e2e/now.spec.ts「投稿した記事がカードで出て」(@content @responsive)、test/lib/now/excerpt.test.ts |
| 3 | カードは公開日の新しい順に並ぶ | e2e/now.spec.ts「新しい順に並ぶ」(@content)、test/lib/now/store.test.ts |
| 4 | カードを押すと半透明のモーダルが開き、Markdown (見出し・チェックリスト・表・リンク) と Mermaid の図が描かれ、閉じられる | e2e/now.spec.ts「カードを押すとダイアログで」(@interaction @responsive) |
| 5 | 記事を消せる (204、ないものは 404、トークンなしは 401) | test/app/api/now/[id]/route.test.ts、e2e/now.spec.ts「DELETE で消した記事」 |
| 8 | 記事を書き換えられる (200。公開日を省けば元のまま、更新日時が付く。ないものは 404、形式違いは 400、トークン違いは 401) | test/app/api/now/[id]/route.test.ts、e2e/now.spec.ts「PUT で直した記事」(@interaction) |
| 9 | 書き込み API (POST・PUT・DELETE) はすべて認証のデコレータを通る | test/decorator/with-bearer-auth.test.ts と各ルートのテストの 401 |
| 6 | 本番は Upstash Redis に保存し、E2E・ユニットは本物の Redis を呼ばない | test/lib/now/store.test.ts (fetch をモック)、playwright.config.ts の webServer の env |
| 7 | a11y の重大な違反がない | e2e/a11y.spec.ts (/now) |
