# WORK-0038 トップを概要にし、導入演出をなくす

PBI: [PBI.md](PBI.md)

## 計画

- [x] 仕様 ([docs/specs/top-overview.md](../../specs/top-overview.md)) と [ADR 0039](../../adr/0039-top-is-overview.md) を書く
- [x] 概要を `/` に移し、`/overview` の 308 を足す — `pnpm build` と e2e/navigation.spec.ts の転送
- [x] `/` の metadata・構造化データ・sitemap を概要に揃える — e2e/seo.spec.ts
- [x] 導入演出と準備完了の通知を消し、`introColors` を `glassColors` に改名する — `pnpm check`
- [x] grid テーマの粒を全ページで揃える — grid.tsx のコードの確認と目視 (粒を見る E2E は無い)
- [x] ページの一覧と文書 (README・AGENTS.md・CONTEXT.md・docs/design/theme.md・docs/specs) を `/` = 概要に合わせる
- [x] テストをまとめて直し、coverage-map を作り直す — `pnpm test:e2e` と `pnpm test:coverage-map -- --check`
- [ ] `pnpm commit-gate`

## ADR が要る判断

- 要る。[0039](../../adr/0039-top-is-overview.md)。トップの役割 (概要を出す)・`/overview` の転送の置き場所・導入演出の削除を決めるため。[0034](../../adr/0034-intro-and-background-handoff.md) を置き換える

## 記録

- 2026-11-10: 持ち主が承認の場で決めたこと。`/` で概要を出す (トップに導入演出を置かない)・導入演出はコードも絵も文言もトークンもすべて消す・`/` の title はほかのタブと同じ「概要 | サイト名」・grid の粒は全ページ同じ数 (200)・PBI-0037 (トップの画面下の帯) の作業フォルダは消す・セキュリティの段は流さない
- 2026-11-10: PBI-0037 は起票の途中で取りやめた。リポジトリにも docs/pbi/README.md にも残っていない
- 2026-11-10: `/overview` の 308 は `next.config.ts` の `redirects()` に置く。`/now` の転送を proxy.ts にしているのは `?post=` を転送先に残さないためで、`/overview` はクエリ (utm など) を残してよい。redirects ならページにも proxy にも届く前に返り、proxy の matcher を広げずに済む。ページの中の `permanentRedirect()` は、Partial Prefetching で殻が先に 200 で返るので使わない (ADR 0035)
- 2026-11-10: 導入演出のためのトークン (`--intro-*`・`--color-intro-*`・`glass-highlight`・`glass-button`) は消す。ガラス調の背景の色は `lib/theme.ts` の `glassColors` (旧 `introColors`) に残し、値は変えない
- 2026-11-10: 背景の遅延読み込み (手が空いてから始める部分) は全ページが使うので残し、準備完了の知らせだけを消す。知らせる相手 (導入演出) がいなくなったため
- 2026-11-10: テストは最後の段でまとめて直す (atelier の tests-at-end)。作業者はテストを書かない
- 2026-11-10: 概要がトップになったので、grid テーマの「トップだけ粒を増やす」をやめた。残すと、概要とほかのタブを行き来するたびに粒が並び直る
- 2026-11-10: テストの段で、導入演出のための E2E とユニット (`e2e/intro.spec.ts`・`e2e/home.spec.ts`・`test/lib/intro/progress.test.ts`) を消し、`/overview` を見ていたテストを `/` に、全ページのループの `/` の重なりを除いた。`/overview` の 308 と、JS を切った `/` の本文の E2E を足した
- 2026-11-10: 全体の E2E で /now の a11y (axe の link-in-text-block) が落ちた。記事の本文中の `TextLink` に下線が無く、周りの文と色だけで見分けていたため。今回の変更より前からある不具合で、記事が溜まると出る。持ち主がこの PR で直すと決め、`TextLink` を常に下線・ホバーで線を太くした (色のトークンは変えない)
- 2026-11-10: 最後のレビュー (2 つのモデル) で、経緯を語るコメント・もう無いトークンを前提にした `glassColors` の説明・sitemap の重複を Set で消す書き方・ADR 0039 の「ヘッダーは 308 にも付く」を直した。`next start` で確かめると、`/overview` の 308 には `headers()` のセキュリティヘッダーが付かない (本文が無いので受け入れる。Vercel では未確認)。クエリは転送先に残る
- 2026-11-10: 手元の Windows の作業ツリーは autocrlf で CRLF になっており、`pnpm format:check` は変えていないファイルまで落ちる。改行を除いた検査 (`prettier --check --end-of-line auto`) は全ファイル合格。CI (LF) では起きない

## 検証

- 2026-11-10: `pnpm lint`・`pnpm typecheck`・`pnpm test:unit`・`pnpm build`・`pnpm test:coverage-map -- --check` は 0。`pnpm test:e2e` は 233/233。書式は `prettier --check --end-of-line auto` で全ファイル合格 (手元の CRLF のため)

```
pnpm commit-gate
```
