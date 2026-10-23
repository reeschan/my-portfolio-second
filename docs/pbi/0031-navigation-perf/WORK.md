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

## 検証

```
pnpm commit-gate
```
