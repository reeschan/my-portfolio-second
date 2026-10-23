# PBI-0031 タブを押したらすぐ中身が替わるようにする

- 状態: 進行中
- 起票日: 2026-10-23
- 依頼者: リポジトリの持ち主
- 作業記録: [WORK.md](WORK.md)
- 関連 ADR: [0035](../../adr/0035-cache-components-and-prefetch.md)、[0026](../../adr/0026-locale-cookie-and-dictionaries.md)、[0030](../../adr/0030-now-post-pages.md)
- 仕様: [docs/specs/glass-theme-and-navigation.md](../../specs/glass-theme-and-navigation.md) (後半)

## 背景・目的

タブを押してから中身が替わるまでの待ちが長く、サイトが重く感じる。全ページがリクエストごとにサーバーで描かれ (ルートのレイアウトが Cookie で表示言語を読むため)、読み込み中の表示も先読みもない。/now は移るたびに外部のデータベースを往復する。言語に依らない殻をすぐ出し、言語ごとの中身は先読みで手元に持っておいて、押した瞬間に切り替わるようにする。

## やること

- Cache Components と Partial Prefetching を有効にする
- ルートのレイアウトで Cookie を読まない。`<html lang>` は `<head>` のスクリプトで Cookie の言語に合わせる
- タブ付きのページをルートグループ `app/(tabs)/` に移し、タブバーとアドレスバーを共通のレイアウトに置く。本文のパネルの位置に読み込み中の枠を出す
- 各ページの中身と metadata を、言語を引数にした `"use cache"` で描く
- /now の記事を作り置きし、投稿・更新・削除のときだけ作り直す。旧リンクの 308 は `proxy.ts` で返す
- グラフ (recharts) と Markdown (react-markdown) を使うときに読み込む
- 変える前と後で、タブを押してから見出しが替わるまでの時間を同じ手順で測る

## やらないこと

- 表示言語を URL で分けること、proxy で言語ごとのページに振り分けること
- 性能の自動テスト (Lighthouse CI など)
- JS を切った閲覧者に、トップ以外のページの本文を見せること
- 本文のパネルのぼかしの強さの変更

## 受け入れ条件

| # | 条件 | 確かめ方 |
| --- | --- | --- |
| 1 | タブ付きのページがビルドの表で ◐ になる (ƒ でない) | `pnpm build` の出力 (WORK に残す) |
| 2 | 本番に近いビルドで、タブを押してから見出しが替わるまでの時間が変更前より縮む | `docs/pbi/tools/measure-nav.mjs` を同じ手順で (WORK に残す) |
| 3 | タブを押してもタブバーが描き直されない | e2e/navigation.spec.ts |
| 4 | 英語に切り替えたあと、先読み済みのタブを押すと英語の中身が出る | e2e/i18n.spec.ts |
| 5 | 英語の Cookie で直接開いたとき `<html lang="en">` になる | e2e/i18n.spec.ts |
| 6 | JS を切ってもトップの見出しと Enter が見える | e2e/home.spec.ts (既存) |
| 7 | 投稿・削除のあとに /now を開くと反映されている | e2e/now.spec.ts |
| 8 | 投稿・更新・削除の API が成功したとき、記事の作り置きを作り直す | test/app/api/now/ |
| 9 | 旧リンクの `/now?post=<id>` は 308 で記事のページに転送する | e2e/now.spec.ts (既存) |
| 10 | 知らない id の記事のページは 404 を返す | e2e/now-post-page.spec.ts (既存) |
| 11 | 全ページのタイトル・説明・構造化データが変わらない | e2e/seo-*.spec.ts (既存) |
| 12 | 開発中に、殻にできていない箇所の指摘 (blocking route) が出ない | `pnpm dev` で全ページを開いてログを見る (WORK に残す) |
| 13 | /skills を開かない限りグラフのライブラリを、/works の詳細を開かない限り Markdown のライブラリを読み込まない | `next/dynamic` で読み込むことをレビューで確かめる |
