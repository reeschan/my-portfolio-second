# WORK-0031 タブを押したらすぐ中身が替わるようにする

PBI: [PBI.md](PBI.md)

## 計画

- [ ] Cache Components を有効にする土台 (設定・API の `runtime` を外す。仕上げまではルートで `instant = false`) — `pnpm build`
- [ ] `<html lang>` を `<head>` のスクリプトで Cookie の言語に合わせる — test/lib/i18n/html-lang.test.ts、e2e/i18n.spec.ts
- [ ] グラフと Markdown を使うときに読み込む — e2e/content.spec.ts など既存の /skills・/works のテスト
- [ ] タブ付きのページを `app/(tabs)/` に移し、タブバーを共通のレイアウトに置く — e2e/navigation.spec.ts、e2e/i18n.spec.ts
- [ ] 各ページの中身と metadata を `"use cache"` で描く — e2e/seo-*.spec.ts、e2e/content.spec.ts
- [ ] /now の記事の作り置きと作り直し、旧リンクの 308 を proxy.ts に移す — test/app/api/now/、e2e/now.spec.ts、e2e/now-post-page.spec.ts
- [ ] 仕上げ: ルートの `instant = false` を外し、トップの殻を整える — `pnpm build` の表、`pnpm dev` の指摘、e2e/home.spec.ts
- [ ] 変更後を同じ手順で測り、変更前と比べる

## ADR が要る判断

- [ADR 0035](../../adr/0035-cache-components-and-prefetch.md): Cache Components と先読み、ルートのレイアウトで Cookie を読まないこと、比べた案。ADR 0026 に追記

## 記録

- 2026-10-23: Next.js 16.4.2 の同梱の文書を調べた (Cache Components・Partial Prefetching・`"use cache"`・`cacheTag`/`revalidateTag`・htmlLimitedBots)。設定は `cacheComponents: true` と `partialPrefetching: true`。`export const runtime` は Cache Components と両立しない。`<Suspense>` の外で Cookie を読むとビルドが落ちる。`"use cache"` は `stale` が 5 分以上でページの殻 (App Shell) の先読みに入る。`revalidateTag` は Route Handler から呼べる (`updateTag` は Server Action だけ)
- 2026-10-23: 変える前を測った。ビルドの表は /opengraph-image と /robots.txt 以外が全部 ƒ。タブを押してから見出しが替わるまで (3 周、`docs/pbi/tools/measure-nav.mjs`):

  | 測った先 | 初回の中央値 | 再訪の中央値 | /now の初回 |
  | --- | --- | --- | --- |
  | 本番 (www.reeschan.pink) | 265ms | 227ms | 444ms |
  | 手元の本番ビルド + 往復 150ms | 340ms | 175ms | 353ms |
  | 手元の本番ビルド (遅延なし) | 38ms | 25ms | 27ms |

  手元の遅延なしは往復が速すぎて差が出ないので、比べるのは上の 2 つ
- 2026-10-23: タブ付きのページはルートグループ `app/(tabs)/` に移す。仕様は「フォルダの構成も変えない」としていたが、それは言語で URL を分けないという意味で、タブバーを移動で描き直さないには共通のレイアウトが要る。トップ (タブなし) と同じ階層のままでは、トップの殻に空のタブバーが出てしまう。URL は変わらない
- 2026-10-23: /now の記事のページ (`app/now/[id]`) はルートグループに入れず、要求時に全部描く (`instant = false`)。共通のレイアウトの `<Suspense>` の中では、中身を流し始めた後に `notFound()` しても状態コードが 200 のままで、既存の「知らない id は 404」が守れないため。旧リンクの 308 も同じ理由でページの外に移す。`next.config.ts` の `redirects` は元のクエリを転送先に付けたままにする (同梱の文書) ので、`/now` だけに当てる `proxy.ts` で返す

- 2026-10-23: Cache Components を有効にすると、開発サーバーを起動した直後の並列の E2E で、初めて開くページのコンパイルが 15 秒を超え、移動のテスト (navigation・intro) が落ちた。直列か、全ページを一度開いて温めたサーバーなら通る。本番ビルドで回す CI には関係しない。手元の確認は、温めたサーバーに当てて回す。開発中の検証はページのセグメントごとに走るので、ルートの `instant = false` だけでは外れず、/now と記事のページにも仮に置いた
- 2026-10-23: 持ち主の判断で、手元で全体の E2E を回すのは節目だけにする (PC が重く、待ちが長いため)。各段階の確認は、変えたところに関係する E2E だけを回す
- 2026-10-24: タブ付きのページを `app/(tabs)/` に移し、タブバーを共通の枠 (`SiteFrame`) に置いた。「タブバーが描き直されない」の E2E は、初めは押す前の要素が `isConnected` かで見ていたが、Cache Components は前のページを unmount せず `<Activity>` で `display: none` のまま残す (同梱の文書 preserving-ui-state.md) ので、各ページがタブバーを描いていた前の構成でも通ってしまった。移動のあとに見えているタブバーを取り直し、同じノードかで確かめる形にした (前の構成では落ちることを確かめた)
- 2026-10-24: 本番ビルドで、知らない id の記事 (`/now/<id>`) が 404 ではなく 200 (本文は 404、noindex 付きの soft 404) になり、旧リンク `/now?post=<id>` の 308 も 200 になる。開発サーバーでは 404 なので手元の E2E では見えず、CI (本番ビルド) の not-found・now-post-page の E2E で落ちる。原因は `partialPrefetching: true` と `generateStaticParams` の無い動的ルートの組み合わせで、ビルドで作る「params が未確定の殻」が先に 200 で返る。`instant = false`・`connection()` の有無・`"use cache"`・`generateStaticParams` では直らず、`partialPrefetching: false` にするとサイト全体の先読みの方式が変わる。`proxy.ts` で記事の有無を先に確かめて、無ければ 404 にする (PBI-014。調べた記録は作業用のノート)
- 2026-10-24: 本番ビルドで並列の E2E を回すと、desktop で移動・言語の切り替えのテストが 8〜10 件、1 回目に落ちて再試行で通る。PBI-011 の前の状態でも同じだけ落ちたので、PBI-011 によるものではない。ヘッドレスの Chromium が並列で WebGL をソフトウェア描画して詰まるためと見ている (CI は再試行 1 回)
- 2026-10-24: 並列の E2E で、言語を切り替えたあとのタブの移動が 15 秒を超えて落ちる原因は、アプリではなく E2E のブラウザの 3D 背景だった。ヘッドレスのブラウザには GPU が無く、背景を CPU (SwiftShader) で描き続けるので、並列の数だけサーバーの CPU を奪う (同じテストを 8 並列で回すと `/career` の応答が 5〜27 秒、8 件とも落ちた)。`reducedMotion: "reduce"` で背景を止めると 0.4〜1 秒になり、8 件とも通った。`"use cache"` の同時の作り置きの待ち合わせ (`crossRequestPendingCacheInvocations`) も疑ったが、`NEXT_PRIVATE_DEBUG_CACHE=1` のログではすべて解決していた。持ち主の判断で、`playwright.config.ts` の全体を `reducedMotion: "reduce"` にし、動きそのものを確かめる `e2e/intro.spec.ts` の「トップの導入演出」と `e2e/background-theme.spec.ts` の「背景テーマ」(テーマごとの描画の smoke は 1 枚だけでは毎フレームの処理のエラーを見逃す) だけを `no-preference` に戻した

## 検証

```
pnpm commit-gate
```
