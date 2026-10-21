# WORK-0024 /now の記事に画像を載せ、押すと拡大して見られるようにする

PBI: [PBI.md](PBI.md)

## 計画

- [x] 画像の中身を調べる純関数 (形式・幅と高さ・危ない SVG) — test/lib/now/image-inspect.test.ts
- [x] 画像の置き場 (Blob とメモリ) と選び方 — test/lib/now/image-store.test.ts (`@vercel/blob` をモック)
- [x] 記事の型に `images` を足し、本文の画像と送られたファイルを結び付ける計画の純関数 — test/lib/now/post-images.test.ts
- [x] multipart の `images` を読み、POST・PUT・DELETE で画像を置く・引き継ぐ・消す — test/app/api/now/、test/lib/now/input.test.ts
- [x] 拡大表示を共通の部品にし、/works を載せ替える — e2e/interaction.spec.ts の /works の拡大表示
- [x] Markdown の部品で対応表の画像を描き、押すと拡大表示を開く。記事のページで対応表を渡す — test/components/common/markdown.test.tsx、e2e/now-post-page.spec.ts
- [x] 抜粋から画像を落とす — test/lib/now/excerpt.test.ts
- [x] ADR 0015 の追記、Markdown の部品のコメント、AGENTS.md — 目で確かめた

## ADR が要る判断

- [ADR 0031](../../adr/0031-now-post-images.md): 受け口・置き場 (public の Blob)・本文の書き方と対応表・受け付けるもの・画像の組・拡大表示・後始末

## 記録

- 2026-10-21: 起票。持ち主から「/now の記事に画像を載せたい。D2 の SVG も拡大表示したい」と依頼。design-flow (Ultracode) で調査 9 本と grilling を行い、仕様 [docs/specs/now-post-images.md](../../specs/now-post-images.md) で合意した
- 2026-10-21: 実装は pbi-orchestration-jev で 8 件に分けて進め、担当はすべて Opus 5.5 にした (持ち主の指定)。8 件とも差し戻しなしで合格
- 2026-10-21: 本文の画像の参照は正規表現ではなく構文木 (unified + remark-parse + remark-gfm) で拾う。コードの中の `![]()` を誤って拾わないため。どれも react-markdown が既に使っている依存で、版も lockfile に合わせた
- 2026-10-21: `imageLookup`・`darkPairName` は `lib/now/post-image-lookup.ts` に分けた。`post-images.ts` は node:crypto と unified を読むので、クライアント部品から import させないため
- 2026-10-21: /works の「元の図を新しいタブで開く」の文言を変えないよう、`ImageViewer` に任意の `openOriginalLabel` を足した (/now は「元の画像を…」)
- 2026-10-21: 決めたこと (仕様に書いていなかった点): 本文の参照のファイル名が decode 後に英数字・`-`・`_`・`.` 以外を含めば `name` の 400 にする / 代替テキストが空の画像は「使われている」とみなし、`alt` の 400 だけを返す / 表で 1 枚も引けない画像だけの段落は `<p>` のまま / 英語の拡大表示の題は「Images in <題名>」
- 2026-10-21: Blob の put の失敗は withErrorHandling で 500 になる (Blob の SDK のエラーは ApiError ではないため)。後始末の失敗はログだけ
- 2026-10-21: 見送り: 画像の最適化、参照されなくなった画像の定期的な掃除、クライアントアップロード、サイト全体のセキュリティヘッダ (仕様の Out of Scope)

## 検証

コミットごとに `pnpm commit-gate` (lint・型・ユニット・必須観点の穴・E2E 全体) が合格。最後のコミットで:

```
pnpm commit-gate
ユニット 368 件、E2E 178 件 passed。commit-gate: 合格
pnpm build
✓ Compiled successfully
```

手元の `pnpm format:check` は、Windows の autocrlf で CRLF になった既存の 4 ファイル (今回触っていない) で警告が出る。変更したファイルはすべて Prettier を通る
