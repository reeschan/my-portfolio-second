# WORK-0034 /works の pbi-orchestration-jev を Atelier に改める

PBI: [PBI.md](PBI.md)

## 計画

- [x] 作品データ (日英) を Atelier の README に合わせて書き直す — 差分を読む
- [x] 図を Atelier のリポジトリの SVG に差し替える — test/data/works.test.ts
- [x] 検査 — `pnpm commit-gate`

## ADR が要る判断

- なし

## 記録

- 2026-10-24: /works は 1 ページに作品を並べてダイアログで詳細を出す作りで、作品ごとの URL は無い。id を変えても壊れるリンクは無いので、id も atelier に改めた。
- 2026-10-24: 図は Atelier のリポジトリ (コミット 9aff282 の assets/) の SVG をそのまま取り込んだ。このリポジトリでは描き直さない。

## 検証

```
pnpm commit-gate
```

2026-10-24: 合格 (lint・書式・型・ユニットテスト・ビルド・E2E 240 件)。
