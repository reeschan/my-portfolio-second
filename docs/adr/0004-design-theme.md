# 0004. デザインテーマ: ダーク既定・青のアクセント・ガラス調、トークンは globals.css を正本にする

- 状態: 採用
- 日付: 2026-10-06
- 関連: PBI-0001、0003、[docs/design/theme.md](../design/theme.md)

## 背景

今の見た目 (暗い紺の背景に three.js の 3D 背景、半透明でぼかしの効いたパネル、青のアクセント) はできていたが、色や質感が画面ごとに直書きされていた。

- `bg-card/60 backdrop-blur-md border-border/20` のような組み合わせがページごとに散らばっていた
- アーキテクチャ図は `blue-500` `green-500` `purple-500`、RSS は `orange-500` と、テーマの外の色を使っていた
- three.js と recharts はトークンを読めないので、色の値がコードに直書きされていた

これでは見た目を変えるときに漏れが出るし、エージェントが新しい画面を作るときに「どの色を使うべきか」が分からない。

## 決定

**今の見た目を変えずに、トークンとして明文化する。** 正本は `app/globals.css`。

1. **ダークテーマを既定**にする (`layout.tsx` の `defaultTheme="dark"`)。OS がライトでもダークで表示する
   - 3D 背景が暗い背景を前提にした配色のため。ライト用のトークンは残すが、切り替え UI は作らない
2. 色は **shadcn/ui 互換の意味のトークン** (`background` `card` `primary` `muted-foreground` …) を使い、HSL のチャンネル値で持つ
   - recharts のように `hsl(var(--primary))` で直接読む部品があるため、チャンネル値の形を保つ
3. このサイトで足したトークン:
   - `chart-1`〜`chart-4`: 図やグラフの塗り分け
   - `rss`: RSS のブランド色
   - `shadow-panel` / `blur-glass`: 3D 背景の上に浮くパネルの質感
   - `intro-backdrop`・`intro-pink`・`intro-violet`・`intro-teal`・`intro-red`: トップの導入演出の地と光の色。演出は常に暗い地で見せるので、ライト・ダークで同じ値 (2026-10-23、[PBI-0029](../pbi/0029-intro-loader/PBI.md))
   - `glass-highlight`: ガラスの縁と内側の光に使う白。`glass-button` の縁・上辺の内側・ホバーの光の帯に使う (2026-10-23、[PBI-0029](../pbi/0029-intro-loader/PBI.md))
   - `blur-glass-panel` (6px): 本文パネル (`glass-panel`) のぼかし。2026-10-21 に足した ([PBI-0025](../pbi/0025-render-load/PBI.md))
     - 本文パネルは大きく、動く 3D 背景の上で毎フレームぼかし直すので、帯の `blur-glass` (12px) より弱める
     - 弱めた分、面の不透明度を 0.6 から 0.75 に上げて、文字の読みやすさを保つ
     - 帯 (`glass-bar`) は `blur-glass` (12px) のまま
4. 質感は **ユーティリティ 1 つ** にまとめる: `glass-panel` (本文のパネル)、`glass-bar` (タブバー・アドレスバー)、`glass-button` (入口などのガラス調のボタン。2026-10-23、[PBI-0029](../pbi/0029-intro-loader/PBI.md))
   - `glass-button` は、面 `card` を 35% で透かし、縁と上辺の内側に `glass-highlight` の光を入れ、`blur-glass` (12px) と彩度 1.2 で背後をにじませる。ホバーでは光の帯が左から右へ横切る
5. CSS 変数を読めない描画先 (three.js) の色は `lib/theme.ts` に集め、globals.css の値と対応をコメントで示す
6. 文字は Inter (`--font-sans`)。日本語はシステムのフォントに任せる
7. 画面側では生の色 (`bg-blue-500`、`#3399ff`) を書かない。足りなければトークンを足す (この ADR を更新するか、新しい ADR を書く)

## 検討した選択肢

| 選択肢 | 良い点 | 悪い点 |
| --- | --- | --- |
| 今の見た目を globals.css のトークンとして明文化 (採用) | 見た目が変わらない。shadcn/ui とそのまま噛み合う | HSL のチャンネル値という少し古い書き方が残る |
| OKLCH に書き換える | 新しい shadcn/ui の既定に揃う。色の計算がしやすい | recharts の `hsl(var(--x))` を全部直す必要があり、見た目が微妙に変わる |
| ライト/ダークの切り替えを作る | 選べる | 3D 背景の配色を 2 通り作る必要がある。今は需要がない |

## 結果

- 新しい画面は `components/common/` の部品とトークンだけで作れる
- テーマが壊れていないことを `e2e/theme.spec.ts` (`testing/e2e-policy.yml` の theme 観点) で確かめる
  - ピクセル比較はしない (0001 の visual-regression を見送った理由と同じ)。代わりにトークンの定義と、画面がトークン経由で塗られていることを computed style で見る
- three.js の色はトークンと自動では連動しない。トークンを変えたら `lib/theme.ts` も直す
