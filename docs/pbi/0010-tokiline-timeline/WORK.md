# WORK-0010 経歴のタイムラインを自作ライブラリ tokiline に置き換える

PBI: [PBI.md](PBI.md)

## 計画

- [x] `tokiline` を dependencies に足す — `pnpm install` が通り、`pnpm-lock.yaml` に `tokiline@0.1.0` が入る
- [x] `app/globals.css` で tokiline の CSS を `components` レイヤーに読み込み、変数を割り当てる — /career の見た目が今と同じ
- [x] `CareerTimeline` を tokiline の部品で組み直す — E2E (/career の @content・@interaction・@a11y) が通る

## ADR が要る判断

- ライブラリの採用: [ADR 0023](../../adr/0023-tokiline-for-career-timeline.md)

## 記録

- 2026-10-13: 起票。develop の経歴は既に `react-vertical-timeline-component` をやめ、手書きの `<ol>` になっていた。これを tokiline に置き換える。tokiline は 2026-10-13 に npm で 0.1.0 を公開済み
- 2026-10-13: 実装。このサイトのトークンは HSL のチャンネルだけを持つので、`.toki-timeline` への変数の割り当ては `hsl(var(--border))` のように hsl() で包んだ (README の例は完全な色の値を前提にしている)。`Timeline` は `side="end"` でカードを常に片側に並べ、カードの面は `TimelineCard` の className で従来どおり Tailwind のクラスを付けた

## 検証

```
pnpm commit-gate
```
