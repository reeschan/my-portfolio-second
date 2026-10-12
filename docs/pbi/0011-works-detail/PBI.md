# PBI-0011 自作の作品を /works に並べ、押すとアーキテクチャ図付きの詳細ダイアログを出す

- 状態: 進行中
- 起票日: 2026-10-13
- 依頼者: リポジトリの持ち主
- 作業記録: [WORK.md](WORK.md)
- 関連 ADR: [0024](../../adr/0024-works-detail-data-and-diagrams.md)

## 背景・目的

/works には「ポートフォリオサイト」と仮置きの「プロジェクト2」しかなく、詳細ダイアログは「ポートフォリオサイト」専用に書かれている。アーキテクチャ図も、レイヤーの名前を 4 段並べただけの簡易なもの。
自作の作品が増えたので、それぞれを /works に並べ、押すと /now の記事のような半透明のダイアログで、説明・アーキテクチャ図・リポジトリへのリンクを見せたい。

## やること

- 作品を 6 件にする: ポートフォリオサイト (my-portfolio-second)、tokiline、pbi-orchestration-jev、shared-memory、management-self-pieces、tracking-health。仮置きの「プロジェクト2」は消す
- 作品のデータ (`data/works.ts`) に、カードの説明・使用技術・リポジトリ (URL と公開 / 非公開)・アーキテクチャ図 (ライト用とダーク用)・詳細の本文 (Markdown) を持たせる
- アーキテクチャ図は各リポジトリの README と同じ D2 の自己完結 SVG を `public/works/<id>/` に写す
- 詳細ダイアログを作品ごとのデータから描く汎用の部品にする。見た目は /now の記事のダイアログ (背景が透ける半透明の面) に合わせ、本文は /now と同じ Markdown の部品で描く
- 図はサイトのテーマ (ライト / ダーク) に合わせて出し分ける。カードの画像にも同じ図を使う
- 公開リポジトリは新しいタブで開くリンクを出し、非公開のものは「リポジトリは非公開」と書く
- /now の Markdown の部品を、作品の詳細からも使えるよう `components/common/` に移す

## やらないこと

- 作品ごとの URL (詳細ページ)
- 各作品のリポジトリへの変更
- 作品の並び替え・絞り込み

## 受け入れ条件

| # | 条件 | 確かめ方 |
| --- | --- | --- |
| 1 | 6 件の作品がカードで並び、カードの画像に代替テキストがある。「プロジェクト2」は無い | e2e/content.spec.ts (/works @content @responsive) |
| 2 | どのカードを押しても、その作品の題名のダイアログが開き、本文・アーキテクチャ図 (代替テキスト付き) が出て、閉じられる | e2e/interaction.spec.ts (/works @interaction) |
| 3 | 公開リポジトリの作品は、リポジトリへのリンクが新しいタブ・`rel="noopener noreferrer"` で出る。非公開の作品はリンクが無く「リポジトリは非公開」と出る | e2e/interaction.spec.ts (/works @interaction) |
| 4 | キーボードだけでダイアログを開閉できる | e2e/interaction.spec.ts (/works @interaction) |
| 5 | 作品のデータが整っている: id が重ならない、図の SVG が `public/` にある、公開リポジトリの URL が `https://github.com/reeschan/` で始まる | test/data/works.test.ts |
| 6 | /now の記事の Markdown と Mermaid の表示が今までどおり動く | e2e/now.spec.ts |
| 7 | /works と /now に重大なアクセシビリティ違反がない | e2e/a11y.spec.ts |
| 8 | lint・型・ユニット・書式・ビルドと、必須観点の穴の検査が通る | `pnpm check`、`pnpm test:coverage-map -- --check` |
