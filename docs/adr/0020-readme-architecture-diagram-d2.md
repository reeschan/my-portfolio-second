# 0020. README の全体像の図は D2 で書き、ライト / ダーク用の自己完結 SVG をコミットする

- 状態: 提案中
- 日付: 2026-10-10
- 関連: [PBI-0007](../pbi/0007-readme-architecture-diagram/PBI.md)

## 背景

- README のアーキテクチャ図は Mermaid の flowchart だけで、使っているサービスや技術がひと目では分からない
- GitHub の README では JavaScript や iframe は動かない。表示できるのは画像 (PNG / SVG) と、GitHub が描く Mermaid だけ
- GitHub は README 内の `<img>` を自社のプロキシ経由で表示し、SVG を `<img>` として描くので、**SVG の中から外部の画像やフォントを読み込めない**
- 構成はまだ変わる (/now、Slack 通知などが最近増えた)。図は手で描き直すより、テキストのソースから描き直せるほうがよい

## 決定

- 全体像の図は **D2** (https://d2lang.com) で `docs/architecture/architecture.d2` に書く
- ロゴは Simple Icons (CC0) と Terrastruct のアイコンを URL で指定し、**d2 が描くときに data URI で SVG に埋め込む**。コミットする SVG は外部 URL を持たない
- ライト用 (`architecture-light.svg`、d2 テーマ 0) とダーク用 (`architecture-dark.svg`、d2 テーマ 200) の 2 枚を描き、README では `<picture>` と `prefers-color-scheme` で出し分ける
  - 黒いロゴ (Vercel、Next.js など) はダーク用で白に替える。ソースでは色を `__MONO__` と書き、描くときに置き換える
- 生成物の SVG もコミットする (GitHub は `.d2` を描けないため)
- 細部 (処理の順番・ファイル名) は今までどおり README の Mermaid 図に書く。D2 の図は全体像だけにし、ノードは 15 個前後に抑える
- d2 は開発者の手元で動かす。CI には入れない

## 検討した選択肢

| 選択肢 | 良い点 | 悪い点 |
| --- | --- | --- |
| **D2 (採用)** | テキストで書ける。単体のバイナリで動く。リモートのアイコンを SVG に埋め込める。テーマが選べる | 手元に d2 が要る。レイアウトの細かい調整はしにくい (ELK はノードの宣言順を配置に使わない) |
| Mermaid のまま | GitHub がそのまま描く。追加の道具が要らない | ロゴを出せない (`architecture-beta` も GitHub では外部アイコンを登録できない) |
| Python の `diagrams` | AWS・GCP の公式アイコンが揃う | Graphviz が要る。Vercel・Upstash・Moonshot のアイコンが無く、自前で画像を用意することになる。出力は主に PNG |
| draw.io (`.drawio.svg`) | GUI で自由に作り込める。GitHub がそのまま表示する | 差分が XML で読めない。構成が変わるたびに手で直す |

## 結果

- README を開くと、各サービスのロゴ入りの全体像が GitHub のテーマに合わせて出る
- 構成を変えたら `.d2` を直して描き直す。描き直し方は [docs/architecture/README.md](../architecture/README.md)
- 生成物 (SVG 2 枚、各 50 KB 前後) をコミットすることと、描き直し忘れで図が古くなる可能性を受け入れる。古くなるのを防ぐため、構成を変える PR では図も見直す
- `testing/e2e-policy.yml` と CI への影響はない
