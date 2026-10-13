# PBI-0015 /now の記事を Markdown のファイルのまま (Postman などで) 投稿できるようにする

- 状態: 進行中
- 起票日: 2026-10-13
- 依頼者: リポジトリの持ち主
- 作業記録: [WORK.md](WORK.md)
- 関連 ADR: [0015](../../adr/0015-now-posts-storage-and-markdown.md) (追記)

## 背景・目的

/now の記事は JSON の `{ title, body }` で投稿する作りで、手元の Markdown のファイルから投稿するには jq などで JSON に詰め直す必要がある。
Postman でファイルを選ぶだけで投稿したい。

## やること

- `POST /api/now` と `PUT /api/now/[id]` が `multipart/form-data` も受ける。`file` に Markdown のファイル、`title`・`publishedAt` は任意
- 題名を省いたら、ファイル先頭の `# 見出し` を題名にして本文から外す。見出しもなければファイル名 (拡張子なし)
- JSON での投稿は今までどおり動く
- Postman のコレクションを `docs/postman/` に置き、README に使い方を書く

## やらないこと

- 画像などファイル以外の添付
- 管理画面

## 受け入れ条件

| # | 条件 | 確かめ方 |
| --- | --- | --- |
| 1 | multipart でファイルを送ると 201 で保存され、先頭の見出しが題名、残りが本文になる | test/app/api/now/route.test.ts、e2e/now.spec.ts (@content) |
| 2 | title・publishedAt の欄を指定すればそれを使い、空欄は指定なしとして扱う | test/app/api/now/route.test.ts |
| 3 | file がない・テキスト・空なら 400、トークンが違えば 401 | test/app/api/now/route.test.ts |
| 4 | PUT もファイルで置き換えられ、公開日は元のまま | test/app/api/now/[id]/route.test.ts |
| 5 | 題名の決め方 (title 欄 → 見出し → ファイル名、BOM・CRLF・閉じの #) | test/lib/now/input.test.ts |
| 6 | JSON の投稿・更新が今までどおり動く | 既存の test/app/api/now/ と e2e/now.spec.ts |
| 7 | lint・型・ユニット・書式・ビルドと必須観点の穴の検査が通る | `pnpm commit-gate` |
