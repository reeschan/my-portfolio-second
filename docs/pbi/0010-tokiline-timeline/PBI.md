# PBI-0010 経歴のタイムラインを自作ライブラリ tokiline に置き換える

- 状態: 進行中
- 起票日: 2026-10-13
- 依頼者: リポジトリの持ち主
- 作業記録: [WORK.md](WORK.md)
- 関連 ADR: [0023](../../adr/0023-tokiline-for-career-timeline.md)

## 背景・目的

/career の経歴は、もとは `react-vertical-timeline-component` で描いていたが、今は `components/features/career/career-timeline.tsx` の手書きの `<ol>` と Tailwind のクラスで描いている。
持ち主がタイムラインの UI ライブラリ [tokiline](https://github.com/reeschan/tokiline) を作り、npm に 0.1.0 を公開した。tokiline は「このポートフォリオの経歴タイムラインを `!important` なしで再現できること」を受け入れ条件にして作られている。
手書きのタイムラインを tokiline に置き換え、線・マーカー・カードの並びをライブラリに任せる。

## やること

- `tokiline` (^0.1.0) を dependencies に足す
- `app/globals.css` で `tokiline/style.css` を Tailwind の `components` レイヤーに読み込み、`--toki-*` の変数をこのサイトのトークンに割り当てる
- `CareerTimeline` を `tokiline/react` の `Timeline` / `TimelineItem` / `TimelineMarker` / `TimelineMeta` / `TimelineCard` で組み直す。カードは片側 (`side="end"`) に並べる
- 見た目 (アイコンのマーカー、日付と「継続中」バッジ、上辺が太いカード、参画先のタグと詳細ダイアログ) と、今の E2E が確かめている振る舞いは変えない

## やらないこと

- 経歴のデータ (`data/career.ts`) の変更
- tokiline 側の変更
- 左右交互 (alternate) の並びにすること

## 受け入れ条件

| # | 条件 | 確かめ方 |
| --- | --- | --- |
| 1 | 経歴が tokiline の部品で描かれ、手書きの線とマーカーの実装が残っていない | `components/features/career/career-timeline.tsx` が `tokiline/react` を import している (レビュー) |
| 2 | すべての経歴の見出し・期間・参画先が出て、参画案件のダイアログが開閉できる | e2e/content.spec.ts、e2e/interaction.spec.ts (/career) |
| 3 | 継続中の経歴に「継続中」バッジが出る | e2e/interaction.spec.ts (/career) |
| 4 | /career に重大なアクセシビリティ違反がない | e2e/a11y.spec.ts (/career) |
| 5 | lint・型・ユニット・書式・ビルドが通る | `pnpm check` |
