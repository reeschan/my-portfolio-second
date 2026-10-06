# 0006. 可視化と 3D 背景: React Three Fiber と Recharts

- 状態: 採用 (後付け)
- 日付: 2026-10-06 (決定自体はサイト立ち上げ時)
- 関連: PBI-0001、0004

## 背景

「データ駆動の視覚化を重視したデザイン」をサイトの特徴にしている。スキルはレーダーチャート、全ページの背後には 3D の背景を置く。

> この ADR は、すでに採用していた選択を後から記録したもの。

## 決定

- 3D 背景は **three.js を React Three Fiber (+ drei)** で書く (`components/features/background/`)
  - サーバーでは描けないので `next/dynamic` の `ssr: false` で読み込み、ハイドレーションが終わるまでは背景色だけを出す
  - 装飾なので a11y の検査 (axe) からは外す
- グラフは **Recharts** (`components/features/skills/skill-radar.tsx`)
  - 大きさを測れないサーバーでは描かず、同じ高さの枠を出しておく (レイアウトのずれを防ぐ)
- 「ブラウザで描画しているか」の判定は `hooks/use-is-client.ts` (`useSyncExternalStore`) にまとめる
  - `useEffect` の中で `setState` すると React Compiler の lint (react-hooks/set-state-in-effect) に引っかかり、レンダーも 1 回余計に走るため

## 検討した選択肢

| 選択肢 | 良い点 | 悪い点 |
| --- | --- | --- |
| R3F + Recharts (採用) | React の書き方のまま 3D とグラフを書ける | three.js はバンドルが大きい (動的読み込みで初回表示への影響を抑える) |
| CSS / SVG だけの背景 | 軽い | 奥行きやマウスへの追従が表現しにくい |
| D3 を直接使う | 自由度が高い | React との状態の受け渡しを自前で書く必要がある |

## 結果

- three.js と recharts は CSS 変数を (一部) 読めないため、色は `lib/theme.ts` から渡す (0004)
- 3D 背景とアニメーションがあるため、画像比較テストは入れない (0001)
