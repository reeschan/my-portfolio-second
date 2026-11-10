# PBI-0038 トップを概要にし、導入演出をなくす

- 状態: 進行中
- 起票日: 2026-11-10
- 依頼者: リポジトリの持ち主
- 作業記録: [WORK.md](WORK.md)
- 関連 ADR: [0039](../../adr/0039-top-is-overview.md) (置き換える: [0034](../../adr/0034-intro-and-background-handoff.md))、[0035](../../adr/0035-cache-components-and-prefetch.md)、[0038](../../adr/0038-default-locale-shell.md)
- 仕様: [docs/specs/top-overview.md](../../specs/top-overview.md)

## 背景・目的

トップ (`/`) は 5 秒の導入演出のあとに名前と「Enter」だけの画面で、中身を見るにはもう一度押す必要がある。初めて来た閲覧者 (採用担当や発注者) は、最初の 1 画面で何のサイトかが分からない。検索エンジンから見ても、トップは文字の少ない薄いページになっている。

`/overview` には自己紹介と各ページへの案内がそろっている。これを `/` でそのまま出し、導入演出のためだけにあったコード・絵・文言・トークン・テストをすべて消す。

## やること

- `app/(tabs)/overview/page.tsx` を `app/(tabs)/page.tsx` に移し (`git mv`)、導入演出のトップ (`app/page.tsx`) を消す。タブの並び (`lib/navigation.ts`) の概要の href を `/` にする
- `/overview` を `next.config.ts` の `redirects()` で 308 (`permanent: true`) にし、`/` へ送る
- `/` の metadata を概要のものにし、path だけ `/` にする。構造化データの ProfilePage の url と sitemap も `/` に揃える
- 導入演出を消す: `components/features/intro/`、`lib/intro/`、`public/intro/` の絵、`data/messages` の `intro` キー (ja と en)、`app/globals.css` の `--intro-*`・`--color-intro-*`・`glass-button`・`--glass-highlight`
- 背景の準備完了の通知 (`lib/background-load.ts` の後半と `scene.tsx` の Notifier) を消す。読み込みを始める部分は全ページが使うので残す
- `lib/theme.ts` の `introColors` を `glassColors` に改名する (値は変えない)
- grid テーマの「トップだけ粒を増やす」(`pathname === "/"`) をやめ、全ページで 200 にする
- テストは最後の段でまとめて直す ([ADR 0039](../../adr/0039-top-is-overview.md) の結果に、消す・足す・直すものを列挙してある)。最後に `pnpm test:coverage-map -- --write` で表を作り直す

## やらないこと

- 概要ページの中身・見た目の変更
- PBI-0037 (トップの画面下の帯)。取りやめる
- 使われていない `--animate-rise` / `--animate-fade-in` の整理
- 過去の PBI の記録の書き換え
- URL を言語で分けること、Cookie で言語を持つ仕組み (ADR 0026) の変更

## 受け入れ条件

| # | 条件 | 確かめ方 |
| --- | --- | --- |
| 1 | `/` を開くと、すぐに概要の自己紹介と各ページへの案内が読める | e2e/content.spec.ts (@content) |
| 2 | `/` でもタブの並びが見え、「概要」のタブが選ばれている | e2e/navigation.spec.ts (@navigation) |
| 3 | `/overview` は 308 と `location: /` を返す | e2e/navigation.spec.ts (@navigation。`request.get` と `maxRedirects: 0`) |
| 4 | `/` の title は「概要 \| Ryuki Tobita's Portfolio」、h1 は「概要」 | e2e/seo.spec.ts (@smoke)、e2e/seo-headings.spec.ts (@seo) |
| 5 | JS を切った閲覧者とクローラーが、`/` の最初の HTML で概要の本文を読める | e2e/seo-crawler-shell.spec.ts (@seo。pages に `/` を足す) |
| 6 | 導入演出と準備完了の通知のコード・絵・文言・トークン・テストが残っていない | `pnpm check` (型・lint・ユニット・ビルド)、`pnpm test:coverage-map -- --check` (穴が無い) |
| 7 | 概要とほかのタブを行き来しても grid の粒が並び直らない (全ページ同じ数) | `components/features/background/themes/grid.tsx` の `<Particles count={200} />` にパスでの分岐が無いことを最後のレビューでコードで確かめる。加えて持ち主が動いているサイトを目視する |
