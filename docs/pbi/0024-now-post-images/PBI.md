# PBI-0024 /now の記事に画像を載せ、押すと拡大して見られるようにする

- 状態: 進行中
- 起票日: 2026-10-21
- 依頼者: リポジトリの持ち主
- 作業記録: [WORK.md](WORK.md)
- 関連 ADR: [0031](../../adr/0031-now-post-images.md) (ADR 0015 の画像の部分を置き換える)
- 仕様: [docs/specs/now-post-images.md](../../specs/now-post-images.md)

## 背景・目的

D2 で描いたライト用・ダーク用の SVG の図を含む技術記事を /now に載せたい。今は画像を置く場所も、記事と一緒に画像を送る方法も無く、外部の画像を止める仕組みも無い。縦長の図は本文の幅では文字が読みにくいので、/works の図のように拡大して見たい。

## やること

- `POST /api/now`・`PUT /api/now/[id]` の multipart に `images` 欄を足し、.md と画像を 1 回で受ける
- 画像の中身を調べる (形式・幅と高さ・危ない SVG)
- /now 専用の public の Vercel Blob に置く (`NOW_IMAGES_BLOB_READ_WRITE_TOKEN`)。開発中と E2E はメモリに置く
- 記事に画像の対応表 `images` を持たせ、本文の相対パスの画像を対応表で描く。`-light`/`-dark` の組はテーマで出し分ける
- PUT で外れた画像と、DELETE した記事の画像を Blob から消す
- /works の `ArchitectureViewer` を共通の画像の拡大表示にし、記事の画像を押すと開く
- 抜粋から画像を落とす
- ADR 0015 に置き換えの 1 行を足し、Markdown の部品のコメントと AGENTS.md を改める

## やらないこと

- `<picture>` や生の HTML の画像の受け付け、外部の画像の表示
- SVG のサニタイズ (危ないものは断るだけ)
- 画像の最適化、定期的な掃除、クライアントアップロード
- サイト全体のセキュリティヘッダ (別の PBI)
- RSS の全文配信・記事ごとの OGP 画像

## 受け入れ条件

| # | 条件 | 確かめ方 |
| --- | --- | --- |
| 1 | .md と画像を multipart で POST すると 201 になり、レスポンスに画像の対応表 (名前・URL・幅・高さ) が入り、画像が置き場にある | test/app/api/now/route.test.ts |
| 2 | 本文の画像に対応するファイルが無い・同じ名前が 2 つ・使われていないファイル・外部の画像・代替テキストが空・許されない形式・1 枚 1MB 超・21 枚以上で 400、全体 4MB 超で 413 になり、何も保存されない | test/app/api/now/route.test.ts |
| 3 | 使われている `-light` と組になる `-dark` は、本文に書かなくても受け付ける | test/app/api/now/route.test.ts |
| 4 | 形式を中身で判定し、PNG・JPEG・WebP・SVG の幅と高さを読む。拡張子と食い違えば断る | test/lib/now/image-inspect.test.ts (名前は実装で決める) |
| 5 | SVG の `<script>`・`on*` 属性・`<foreignObject>`・外部の参照・入れ子の `data:image/svg+xml` の中の危ないものを断り、D2 が出す作りの SVG は通す | test/lib/now/image-inspect.test.ts |
| 6 | PUT で画像を送らなければ元の対応表を引き継ぎ、送った画像は差し替わり、本文から外した画像は対応表と置き場から消える | test/app/api/now/[id]/route.test.ts |
| 7 | DELETE で記事の画像も置き場から消える。画像を消すのに失敗しても PUT・DELETE は成功を返す | test/app/api/now/[id]/route.test.ts |
| 8 | 本番で `NOW_IMAGES_BLOB_READ_WRITE_TOKEN` が無ければ画像つきの投稿だけ 503、画像の無い投稿は通る | test/app/api/now/route.test.ts |
| 9 | Blob の置き場は、public・専用のトークン・不変のパス・キャッシュ 1 年で put し、記事 id ごと・URL ごとに消せる | test/lib/now/ の置き場のテスト (`@vercel/blob` をモック) |
| 10 | 記事のページに画像が幅・高さ付きで出て、組ならテーマに合う方だけが見え、対応表に無い画像は代替テキストの文字になる | e2e/now-post-page.spec.ts (@interaction)、Markdown の部品のユニットテスト |
| 11 | 記事の画像を押すと拡大表示が開き、倍率を変えられ、Esc で閉じると画像にフォーカスが戻る。axe の重大な違反が無い | e2e/now-post-page.spec.ts (@interaction・@a11y) |
| 12 | /works の拡大表示の既存の E2E がそのまま通る | e2e/ の /works の拡大表示のテスト |
| 13 | カードと RSS の抜粋に画像の代替テキストが出ない | test/lib/now/excerpt.test.ts |
| 14 | 必須の観点に穴がなく、lint・型・ユニット・ビルドが通る | `pnpm test:coverage-map -- --check`、`pnpm check` |
