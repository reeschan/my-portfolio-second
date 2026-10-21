# WORK-0025 表示した後の描画を軽くして、サイト全体をサクサクにする

PBI: [PBI.md](PBI.md)

## 計画

- [x] 背景の描画の設定 (30fps・antialias・GPU の指定・解像度の自動調整・reduced-motion) — test/lib/background-frame.test.ts、e2e/background-theme.spec.ts
- [x] グリッドのテーマの無駄を直す — e2e/background-theme.spec.ts
- [x] 本文パネルのぼかしを弱める — e2e/theme.spec.ts
- [x] 背景の reduced-motion の E2E — e2e/background-theme.spec.ts
- [x] トップの見出しをサーバーで描き、演出を CSS にする — e2e/home.spec.ts
- [x] ADR 0012・0004・docs/design/theme.md の更新

## ADR が要る判断

- ADR 0012 (背景の描画の負荷の決め方) と ADR 0004 (本文パネル用のぼかしのトークン `--blur-glass-panel` の追加) を更新する

## 記録

- 2026-10-21: Lighthouse の結果と、コードの調査から、重さの原因を「表示した後の常時描画とぼかし」と判断した。持ち主と次の 3 点を決めた
  - 背景は見た目をほぼ保って削る
  - ぼかしは本文パネルだけ弱める
  - トップの見出しはサーバーで出す
- 2026-10-21: 30fps に間引くと、drei の PerformanceMonitor の既定の bounds (40〜60fps) では常に「重い」と判定される。そこで bounds を `[24, Infinity]` にし、24fps を下回ったときだけ解像度を下げる
- 2026-10-21: 全ページの静的化 (ADR 0026 の Cookie) は見送り、別の PBI にする
- 2026-10-21: Canvas の `dpr` に数値を渡すと、等倍の端末でもその倍率で描いてしまう。範囲 `[1, 状態]` で渡し、端末の画素密度を 1〜1.75 に抑える形にした
- 2026-10-21: GPU の指定 (`powerPreference`) は付けず既定に任せた。ノート PC で外付けの GPU を起こさないため
- 2026-10-21: 視差効果を減らす設定の E2E は、背景が `@interaction` (テーマを選ぶ操作)、トップが `@a11y` (OS の設定への配慮) の観点にした
- 2026-10-21: E2E (background-theme・theme・home・content・i18n)、lint・型・ユニット・ビルドがすべて通った

## 検証

```
pnpm commit-gate
```
