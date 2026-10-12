# 0024. 作品の詳細はデータで持ち、図は各リポジトリの D2 の SVG を写して出す

- 状態: 提案中
- 日付: 2026-10-13
- 関連: [PBI-0011](../pbi/0011-works-detail/PBI.md)、[ADR 0020](0020-readme-architecture-diagram-d2.md)

## 背景

- /works の詳細ダイアログは「ポートフォリオサイト」専用に書かれ、作品が増えると部品も増えていく
- 載せたい作品はどれも、README に D2 で描いたロゴ入りのアーキテクチャ図 (ライト用・ダーク用の自己完結 SVG) を持っている ([ADR 0020](0020-readme-architecture-diagram-d2.md) と同じ形)
- 作品の説明は、見出し・箇条書き・リンクを使いたい。/now の記事は既に Markdown の部品 (`features/now/markdown.tsx`) で描いている
- 部品の決まりで、features 同士は import しない ([components.md](../design/components.md))
- 作品のリポジトリには非公開のものもある

## 決定

- 作品の詳細は `data/works.ts` のデータで持つ: カードの説明、使用技術、リポジトリ (`url` と `visibility: "public" | "private"`)、アーキテクチャ図 (`light` / `dark` の SVG のパスと代替テキスト)、本文 (Markdown)。詳細ダイアログは 1 つの汎用の部品にする
- 図は各リポジトリの SVG を `public/works/<id>/architecture-light.svg` と `architecture-dark.svg` に写してコミットする。図のソース (`.d2`) は元のリポジトリに置いたままにする。図の無い作品を足すときは、先に元のリポジトリで描く
- 図はサイトのテーマに合わせ、`dark:` の variant で 2 枚を出し分ける (README の `<picture>` と違い、サイトのテーマは OS の設定ではなく next-themes のクラスで決まるため)。カードの画像にも同じ図を使う
- `Markdown` と `MermaidDiagram` を `components/common/` に移し、/now と /works の両方から使う
- 非公開のリポジトリはリンクを出さず「リポジトリは非公開」と書く (閲覧者には 404 になるため)

## 検討した選択肢

| 選択肢 | 良い点 | 悪い点 |
| --- | --- | --- |
| **SVG を写してコミット (採用)** | ビルド時も表示時も外部に依存しない。非公開リポジトリの図も出せる | 元のリポジトリの図を直したら写し直しが要る |
| GitHub の raw URL を直接読む | 写す手間が無く、常に最新 | 非公開リポジトリの図は読めない。GitHub が落ちると図が出ない。`next/image` の外部ドメインの許可が要る |
| 作品ごとに詳細の部品を書く | 作品ごとに自由に作り込める | 作品が増えるたびに部品と分岐が増える |

## 結果

- 作品を足すときは、`data/works.ts` に 1 件足し、図を `public/works/<id>/` に置くだけになる
- 図が古くならないよう、元のリポジトリの構成を変えたら写し直す。写したことは test/data/works.test.ts (SVG があるか) で確かめる
- `testing/e2e-policy.yml` と CI への影響はない
