# WORK-0017 Vercel Analytics で閲覧数を計測する

PBI: [PBI.md](PBI.md)

## 計画

- [x] ADR を書く — [0027](../../adr/0027-vercel-analytics.md)
- [x] `@vercel/analytics` を入れ、`app/layout.tsx` に `<Analytics />` を置く — Vercel 上でだけ描く
- [x] 有効にする条件をユニットで確かめる — test/lib/analytics.test.ts が通る
- [x] Vercel 以外で計測スクリプトを読まないことを E2E で確かめる — e2e/smoke.spec.ts が通る
- [ ] デプロイ後、ダッシュボードにページビューが出る — 持ち主が確かめる

## ADR が要る判断

- 外部サービス (Vercel Web Analytics) の採用: [0027](../../adr/0027-vercel-analytics.md)

## 記録

- 2026-10-13: 起票。`@vercel/analytics` 2.0.1 を入れた
- 2026-10-13: `<Analytics />` は Vercel 以外で読み込むと、本番ビルドでは `/_vercel/insights/script.js` が 404 になり (console エラーになる)、dev では外部の `va.vercel-scripts.com` からデバッグ用スクリプトを読む。E2E の console エラー検出と「テストから外部に出ない」方針に掛かるので、`VERCEL=1` のときだけ描くことにした
- 2026-10-13: `pnpm add` で `pnpm-lock.yaml` の既存の依存の書き方 (`supports-color@7.2.0` の付け方) も変わった。pnpm 9.15〜10.33 のどれで作り直しても同じ差分になるので、そのまま入れる

## 検証

```
pnpm commit-gate
```
