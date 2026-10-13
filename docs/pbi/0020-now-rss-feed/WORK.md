# WORK-0020 RSS に /now の記事を載せる

PBI: [PBI.md](PBI.md)

## 計画

- [x] フィードの組み立てを `lib/now/feed.ts` の純粋な関数にする — test/lib/now/feed.test.ts
- [x] `app/rss.xml/route.ts` が保存先から記事を読んで返す。保存先が落ちても空のフィードを返す — e2e/now.spec.ts
- [x] `/now?post=<id>` でダイアログを開き、閉じたら `?post=` を消す — e2e/now.spec.ts
- [x] `pageMetadata()` の `alternates.types` で全ページにフィードの場所を出す — e2e/now.spec.ts

## ADR が要る判断

- なし (保存先は ADR 0015、URL は ADR 0029 のまま)

## 記録

- 2026-10-13: 起票。サイトの見直しで「RSS に記事が 1 件も入らない」と挙がった。PBI-0019 (#53) の `siteUrl` を使うので、そのブランチの上で作る
- 2026-10-13: 記事ごとのページはないため、item のリンクは `/now?post=<id>` にし、/now がそのダイアログを開いて出すようにした。guid は URL ではなく記事の id (`isPermaLink="false"`)
- 2026-10-13: `lastBuildDate` は現在時刻をやめ、最新の記事の `updatedAt` (なければ `publishedAt`) にした。CDN のキャッシュは 1 日から 1 時間にした (記事を出してから届くまでを短くする)
- 2026-10-13: 閉じたときの `?post=` の消去は `history.replaceState` で行う。`router.replace` だとサーバーで描き直すため

## 検証

```
CI=1 pnpm commit-gate  # 本番ビルドで E2E 163 件すべて合格
```
