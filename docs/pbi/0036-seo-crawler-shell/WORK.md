# WORK-0036 JS を動かさないクローラーが本文を読めるようにする

PBI: [PBI.md](PBI.md)

## 計画

- [x] 本番の HTML で、本文がどの `<Suspense>` の穴に入っているかを確かめる
- [x] ADR 0038 を書いてから、殻と本文の境界を変える
- [x] 404 の twitter と、トップの h1 の空白を直す
- [x] E2E を足し、本番ビルドの HTML で本文の位置を確かめる
- [x] `pnpm commit-gate`

## ADR が要る判断

- 要る。[0038](../../adr/0038-default-locale-shell.md)。ADR 0035 の「JS を切ると本文が出ない」と、ADR 0036 の「本文だけをパネル内の `<Suspense>` で待つ」を、本文を殻に置く形に変えるため

## 記録

- 2026-10-25: 本番 (https://www.reeschan.pink) を Cookie 無しの通常の UA で取得した。タブ付きのページはどれも、本文が `<div hidden id="S:">` の中だけにある。`/overview` と `/career` はタブバーと同じ穴に本文が入り、`/works` と `/now` はパネル内の `<Suspense>` がもう一段の穴を作っている。`/skills` は本文がタブバーと同じ穴に入るが、その穴も `hidden` なのでクローラーは読めない。原因は `SiteFrame` がページ全体を Cookie の `<Suspense>` で包んでいること。`use cache` の中身も、Cookie を読んでから描くとその殻に入らない (Next.js の caching の説明どおり、fallback だけが殻に残る)
- 2026-10-25: トップの h1 は `.title` が縦の flex で、名前と `Portfolio` が別の子なので、テキストとしては空白が消える。見た目を変えずに空白を足すには、画面に出ない文字の空白を 1 つ置く。自己紹介の一行は、導入演出のキャプションが名前・Portfolio・状態の文字で埋まっているので足さない
- 2026-10-25: 404 の `generateMetadata` は `openGraph` を丸ごと置き換えているが `twitter` を渡していない。親の twitter の題と説明が残る
- 2026-10-25: E2E の HTML の切り出しを正規表現からやめた。CodeQL が script の除去と `&amp;` の置換を指摘したため、ブラウザの `DOMParser` で読む。script は実行しない

## 検証

- 2026-10-25: `pnpm typecheck` 成功。`pnpm exec eslint`（変更した ts/tsx）成功。`pnpm test:unit` は 51 ファイル・523 件成功
- 2026-10-25: `pnpm build` 成功。タブ付きのページは ◐ のまま（`/now` は revalidate 5m、`/career` と `/overview` は 30d）。Cache Components と部分プリレンダーは残っている
- 2026-10-25: 本番ビルド (`pnpm start --port 3200`) の HTML で、`/works` の「ポートフォリオサイト」、`/skills` の「応用情報技術者」、`/now` の紹介文が `hidden id="S:"` の外にある。変更前の https://www.reeschan.pink では同じ文言が穴の中だけだった。トップの h1 の文字は「Ryuki Tobita Portfolio」。404 は 404 のまま、twitter:title は「ページが見つかりません | Ryuki Tobita's Portfolio」、twitter:description は 404 の本文
- 2026-10-25: 本番ビルドに対する Playwright（desktop）で、seo-crawler-shell・not-found・home・intro・content・navigation・i18n の 64 件が成功。言語の切り替え、先読みを落としたときの見出しとパネル、タブバーが描き直されないことも含む
- 2026-10-25: dev サーバーに対する `e2e/seo-crawler-shell.spec.ts` と `e2e/not-found.spec.ts` の 7 件が成功
- 2026-10-25: `pnpm test:e2e` は 249 件成功（desktop と mobile）
- 2026-10-25: 見出しの名前は上、Portfolio はその下（sr-only の空白は 1×1 で、縦並びの位置を取らない）
