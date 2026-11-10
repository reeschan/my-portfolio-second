# デザインテーマ

正本は [app/globals.css](../../app/globals.css)。決定の経緯は [ADR 0004](../adr/0004-design-theme.md)。
このページはトークンの一覧と使い分けの早見表。トークンを足したり意味を変えたりしたら、ここと ADR を更新する。

## 方針

- **ダークテーマが既定**。暗い紺の背景に three.js の 3D 背景を敷き、その上に半透明でぼかしの効いた「ガラス」の面を浮かべる
- アクセントは **青 (primary)** の 1 色。意味のある所だけに使う (現在のタブ、リンク、継続中のバッジ、送信ボタン、言語の切り替えの選択中、`Callout` の `emphasis` の左の線、チャットの利用者の吹き出し、Markdown の引用の左の線、背景テーマの選択中のカードと選べるカードのホバーの枠)。飾りの線や面には使わない
- 画面では生の色 (`bg-blue-500`、`#3399ff`) を書かない。必ずトークン (`bg-primary` など) を使う
- 2026-11-10 に [heydamir/unslop](https://github.com/heydamir/unslop) の観点で見た目を点検した (軽い段階)。見つかった点だけを直し、ガラスの面・タブ風の UI・3D 背景 (既定は「ガラス」のまま) は変えていない

## 色

値は HSL のチャンネル (`:root` がライト、`.dark` がダーク)。Tailwind では `bg-<名前>` `text-<名前>` `border-<名前>` として使え、`/60` のように透明度を付けられる。

| トークン                             | ダークの値                       | 使いどころ                                                                                               |
| ------------------------------------ | -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `background` / `foreground`          | `220 30% 10%` / `220 10% 98%`    | ページの地と本文の文字                                                                                   |
| `card` / `card-foreground`           | `220 25% 12%` / `220 10% 98%`    | パネル・カードの面                                                                                       |
| `primary` / `primary-foreground`     | `210 100% 60%` / 白              | アクセント (現在のタブ、リンク、継続中のバッジ、送信ボタン、言語の切り替えの選択中、`emphasis` の左の線) |
| `secondary` / `secondary-foreground` | `240 10% 20%` / 白               | 控えめなラベル (参画先のバッジ、タイムラインの点)                                                        |
| `muted` / `muted-foreground`         | `240 5% 20%` / `240 5% 65%`      | 補足の面と文字 (説明文、日付、使用技術)                                                                  |
| `accent` / `accent-foreground`       | `240 10% 20%` / 白               | ホバー時の面 (outline・ghost のボタン)                                                                   |
| `destructive`                        | `0 100% 50%`                     | エラーの文字 (チャットのエラー)                                                                          |
| `border` / `input` / `ring`          | `240 6% 20%` / 同 / `240 5% 65%` | 枠線、入力欄の枠、フォーカスリング                                                                       |
| `chart-1`〜`chart-4`                 | 青 / 明るい青 / 緑 / 紫          | 図やグラフの塗り分け (アーキテクチャ図のレイヤー)。番号順に使う                                          |
| `rss`                                | `25 95% 53%`                     | RSS アイコンのホバー色 (ブランド色なのでライト・ダーク共通)                                              |

### 透明度の慣習

| 書き方                    | 意味                                                         |
| ------------------------- | ------------------------------------------------------------ |
| `border-border/20`        | ガラスの面の縁 (ほぼ見えない細い線)                          |
| `border-border/40`〜`/50` | カードの縁、`Callout` の `tinted` の囲み                     |
| `bg-primary/5`〜`/10`     | 意味のある強調の薄い面 (現在のタブ、継続中のバッジ)          |
| `bg-background/40`        | 囲みや控えめな面を少しだけ明るくする (`Callout` の `tinted`) |
| `bg-background/50`〜`/60` | 3D 背景の上の帯や入れ物                                      |

## 質感

| ユーティリティ | 中身                                                                                | 使いどころ                             |
| -------------- | ----------------------------------------------------------------------------------- | -------------------------------------- |
| `glass-panel`  | 枠 `border/20` + 面 `card/75` + 影 `shadow-panel` + ぼかし `blur-glass-panel` (6px) | ページ本文のパネル (`GlassPanel` 部品) |
| `glass-bar`    | 面 `background/60` + ぼかし `blur-glass` (12px)                                     | タブバー・アドレスバー                 |

## 文字

- 書体: 本文は Geist (`--font-sans`)、補足は Geist Mono (`--font-mono`)。どちらも `next/font/google` で読み込む。日本語はシステムの書体 (Hiragino Sans / Noto Sans JP) に任せる
- 見出しの太さは 600 (`font-semibold`) まで。それより太い字は使わない
- `tracking-tight` は 40px 以上の大きな文字だけに使う (今は使っていない)
- 等幅 (Geist Mono) を使う所: 日付 (経歴の期間・/now の記事の日付。`tabular-nums` と一緒に)、アドレスバーの URL、使用技術のタグ (`Badge` の `muted`)
- 大きさの使い分け

| 用途                | クラス                                                       | 部品                              |
| ------------------- | ------------------------------------------------------------ | --------------------------------- |
| ページの見出し (h1) | `text-4xl font-semibold`                                     | `TabPageTemplate`・`PageTemplate` |
| 区切りの見出し (h2) | `text-2xl font-semibold` (大) / `text-xl font-semibold` (中) | `Section` の `size`               |
| カードの見出し (h3) | `text-lg font-semibold` または `font-medium`                 | 各 features の部品                |
| 補足                | `text-sm text-muted-foreground`                              | —                                 |

## 角丸・影

- 角丸: `--radius` (0.5rem) を基準に `rounded-lg` / `rounded-md` / `rounded-sm`。バッジは `rounded-md` (pill にしない)
  - 例外はブラウザの見た目を写した印: アドレスバー・言語の切り替え・RSS のボタンは丸 (`rounded-full`) のまま
- 影: ダークの面では影で奥行きを出さない。面の明るさの段差と細い線 (`border-border/40` 前後) で出す
  - 残す影: 3D 背景の上に浮くガラスの面 (`shadow-panel`) とダイアログの影
  - 使わない影: カードの `shadow-md`、アバターの `shadow-lg`、ホバーで影を強める

## 動き

- ホバーは色と面の変化だけにする。押せるカードは `hover:border-border hover:bg-background/70`
- 浮かせない (`translate` で持ち上げない)、拡大しない (`scale`)、`transition-all` は使わない。動かす性質を名前で指定する (`transition-colors` など)

## CSS 変数を読めない描画先

three.js (3D 背景) と recharts (レーダーチャート) は [lib/theme.ts](../../lib/theme.ts) から色を受け取る。

- `sceneColors`: three.js 用の 16 進数の色。`.dark` の値と対応をコメントで示している
- `glassColors`: ガラスの背景テーマの 16 進数の色。シェーダー (`components/features/background/themes/glass.tsx`) と、/theme のガラスの見本が使う。シーンは常に暗い地で描くので、ライト・ダークで同じ値になる
- `chartColors`: recharts 用の `hsl(var(--x))` の文字列

globals.css のトークンを変えたら、`sceneColors` も手で直す (自動では連動しない)。`glassColors` は対応するトークンを持たず、ガラスの背景の色そのものの出どころとして [lib/theme.ts](../../lib/theme.ts) にある。

## テスト

`e2e/theme.spec.ts` (`testing/e2e-policy.yml` の theme 観点) が、全ページで次を確かめる。

- OS がライトでもダークテーマで表示される
- 上の表の主要トークンが定義されている
- 画面の背景色がトークンから決まっている (生の色で上書きされていない)
- 本文パネルがガラス調 (半透明 + ぼかし) になっている
