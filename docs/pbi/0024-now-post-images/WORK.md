# WORK-0024 /now の記事に画像を載せ、押すと拡大して見られるようにする

PBI: [PBI.md](PBI.md)

## 計画

- [ ] 画像の中身を調べる純関数 (形式・幅と高さ・危ない SVG) — 画像の検査のユニットテスト
- [ ] 画像の置き場 (Blob とメモリ) と選び方 — 置き場のユニットテスト (`@vercel/blob` をモック)
- [ ] 記事の型に `images` を足し、multipart の `images` を読んで本文と結び付ける — input のユニットテスト
- [ ] POST・PUT・DELETE で画像を置く・引き継ぐ・消す — route のユニットテスト
- [ ] 拡大表示を共通の部品にし、/works を載せ替える — /works の既存の E2E
- [ ] Markdown の部品で対応表の画像を描き、押すと拡大表示を開く。記事のページで対応表を渡す — Markdown の部品のユニットテスト、e2e/now-post-page.spec.ts
- [ ] 抜粋から画像を落とす — excerpt のユニットテスト
- [ ] ADR 0015 の追記、Markdown の部品のコメント、AGENTS.md — 目で確かめる

## ADR が要る判断

- [ADR 0031](../../adr/0031-now-post-images.md): 受け口・置き場 (public の Blob)・本文の書き方と対応表・受け付けるもの・画像の組・拡大表示・後始末

## 記録

- 2026-10-21: 起票。持ち主から「/now の記事に画像を載せたい。D2 の SVG も拡大表示したい」と依頼。design-flow (Ultracode) で調査 9 本と grilling を行い、仕様 [docs/specs/now-post-images.md](../../specs/now-post-images.md) で合意した
- 2026-10-21: 実装は pbi-orchestration-jev で進め、担当はすべて Opus 5.5 にする (持ち主の指定)

## 検証

```
pnpm commit-gate
```
