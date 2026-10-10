# PBI-0007 README にロゴ入りのアーキテクチャ図を載せる

- 状態: 進行中
- 起票日: 2026-10-10
- 依頼者: リポジトリの持ち主
- 作業記録: [WORK.md](WORK.md)
- 関連 ADR: [0020](../../adr/0020-readme-architecture-diagram-d2.md)

## 背景・目的

README のアーキテクチャは Mermaid の flowchart だけで、文字の箱が並ぶ図になっている。
GitHub の README を開いた人が、使っている技術とサービスのつながりをひと目でつかめるように、AWS のアーキ図のような各サービスのロゴ入りの図を README の先頭に置きたい。

## やること

- 全体像を表すロゴ入りのアーキテクチャ図を D2 で書き、`docs/architecture/` に置く (ソースの `.d2` とライト用・ダーク用の SVG)
- README の「アーキテクチャ」節の先頭に、GitHub のライト / ダークテーマで出し分ける図として埋め込む
- 既存の Mermaid の図は「詳細」として残す
- 図の描き直し方を `docs/architecture/README.md` に書く
- 作図ツールの選択を ADR に残す

## やらないこと

- CI で図を自動生成すること (d2 を CI に入れるほどの更新頻度ではない。必要になったら別の PBI にする)
- サイト (`/works` など) にこの図を出すこと
- Mermaid の図の書き換え

## 受け入れ条件

画面・機能のコードは変えないため E2E は足さない (docs と README だけの変更)。

| # | 条件 | 確かめ方 |
| --- | --- | --- |
| 1 | `docs/architecture/architecture-light.svg` と `architecture-dark.svg` に外部 URL が残っていない (GitHub の `<img>` で表示できる) | `grep -c 'href="http' docs/architecture/*.svg` が 0 |
| 2 | README の図が、GitHub のライト / ダークテーマの両方で表示される | PR の Files changed で README をライト・ダーク両方で表示して目で確かめる |
| 3 | 図の中身が README の Mermaid 図・AGENTS.md の構成と矛盾しない (ページ・API・外部サービスが一致する) | WORK の検証に突き合わせの結果を書く |
| 4 | `.d2` から同じ SVG を描き直す手順が書いてある | `docs/architecture/README.md` の手順で描き直し、差分が出ないこと |
