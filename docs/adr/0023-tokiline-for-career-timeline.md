# 0023. 経歴のタイムラインは自作ライブラリ tokiline で描く

- 状態: 提案中
- 日付: 2026-10-13
- 関連: [PBI-0010](../pbi/0010-tokiline-timeline/PBI.md)

## 背景

- /career の経歴は、`react-vertical-timeline-component` をやめたあと、`CareerTimeline` の中で `<ol>` と Tailwind のクラスを使って線・マーカー・カードを手で組んでいる
- 持ち主がタイムラインの UI ライブラリ [tokiline](https://github.com/reeschan/tokiline) を作り、npm に 0.1.0 を公開した。CSS と HTML の約束事が本体で、React の部品は Server Component として描ける (実行時の JavaScript なし)。ルールはすべて `@layer tokiline` の中にあり、Tailwind のクラスが `!important` なしで勝つ
- tokiline は「このポートフォリオの経歴タイムラインを再現できること」を受け入れ条件にして作られている (tokiline の `site/acceptance/`)

## 決定

- 経歴のタイムラインは `tokiline/react` の `Timeline` 系の部品で描く。カードは片側 (`side="end"`) に並べる
- CSS は `app/globals.css` で `@import "tokiline/style.css" layer(components);` と読み込む (tokiline の README の Tailwind v4 の推奨)。JavaScript からは読み込まない (読み込み順でレイヤーの強さが変わるため)
- 色・太さは `.toki-timeline` に `--toki-*` の変数でこのサイトのトークン (`--border`、`--primary`、`--card` など) を割り当てる。カードの細かい見た目 (上辺の太線・影) は今までどおり Tailwind のクラスで足す

## 検討した選択肢

| 選択肢 | 良い点 | 悪い点 |
| --- | --- | --- |
| **tokiline (採用)** | 線・マーカー・カードの位置合わせをライブラリに任せられる。Server Component のまま描ける。自作の成果を自分のサイトで使える | 依存が 1 つ増える。tokiline の変更がこのサイトに影響する |
| 手書きの `<ol>` のまま | 依存が無い | 線とマーカーの位置合わせを自前で持ち続ける |
| `react-vertical-timeline-component` に戻す | 有名で情報が多い | クライアントの JavaScript が要る。スタイルを上書きするのに `!important` が要る |

## 結果

- `CareerTimeline` から位置合わせのクラスが消え、経歴の中身だけを書けばよくなる
- tokiline を上げるときは /career の E2E (@content・@interaction・@a11y) で見た目と振る舞いを確かめる
- `testing/e2e-policy.yml` と CI への影響はない
