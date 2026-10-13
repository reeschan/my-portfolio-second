# WORK-0019 サイトの URL を reeschan.pink に揃え、検索と共有に備える

PBI: [PBI.md](PBI.md)

## 計画

- [x] ADR を書く — [0029](../../adr/0029-site-url-and-seo-metadata.md)
- [x] `lib/metadata.ts` に `siteUrl`・`displayHost`・`ogImage`・`pageMetadata` を置き、`lib/navigation.ts` の `displayHost` と RSS の既定値を置き換える — アドレスバーと RSS が `reeschan.pink` を出す
- [x] 全ページの `generateMetadata` を `pageMetadata` にそろえ、足りない 3 ページに足す。ルートの `metadata` を言語別の `generateMetadata` にする — e2e/seo.spec.ts
- [x] `app/opengraph-image.tsx`・`app/sitemap.ts`・`app/robots.ts` を足す — e2e/seo.spec.ts と test/app/ のユニット
- [ ] Vercel で `reeschan.pink` をプロジェクトに足し、DNS を向ける — 持ち主が操作する

## ADR が要る判断

- 本番の URL をコードに固定すること、OGP の画像の作り方: [0029](../../adr/0029-site-url-and-seo-metadata.md)

## 記録

- 2026-10-13: 起票。サイトの見直し (プロジェクトの reviews/site-review-2026-10-13.md) で挙がった「ドメインが違う」「タイトル・OGP が足りない」を 1 つの PBI にした。どちらも本番の URL を 1 か所に置くところから始まるため
- 2026-10-13: 子のページで `openGraph` を書くと、親の `openGraph` は深く混ざらず丸ごと置き換わり、`app/opengraph-image.tsx` の画像も子のページから消えた (E2E で og:image が無いことで気づいた)。`pageMetadata` が毎回 `images` を渡すようにした。トップは同じ階層のファイルの画像が優先される
- 2026-10-13: `next/og` の既定のフォントは日本語の字形を持たない。OGP の画像の文字は英語だけにした。太字の字形も無く、名前は通常の太さで描かれる
- 2026-10-13: アバター (webp) は `next/og` で扱えないので、OGP の画像には載せていない

## 検証

```
CI=1 pnpm commit-gate  # 本番ビルドで E2E 158 件すべて合格
```
