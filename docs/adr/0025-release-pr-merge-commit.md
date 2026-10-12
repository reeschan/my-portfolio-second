# 0025. リリース PR (develop → main) はマージコミットで入れる

- 状態: 提案中
- 日付: 2026-10-13
- 関連: [PBI-0012](../pbi/0012-release-merge-commit/PBI.md)、[ADR 0021](0021-release-pr-and-main-source.md)、[ADR 0007](0007-ci-quality-gate.md)

## 背景

ADR 0021 では、main はリリース PR を Squash and merge でだけ更新していた。Squash のコミットは develop の履歴に入らないので、次のリリース PR では前回と同じ変更が main 側にもあると見なされて衝突する。
「squash 後は main を develop にマージして揃える」手順で避けていたが、手作業なので抜けた (2026-10-13 のリリース PR #30 が 41 ファイルで衝突)。

## 決定

- main のルールセットで許すマージの方法を `merge` (Create a merge commit) だけにする。Squash と Rebase は許さない
- リリース PR の本文のチェック項目を「Create a merge commit でマージする」にし、「main を develop にマージして揃える」を消す
- ADR 0021 のうち、マージの方法の決定だけをこの ADR で置き換える。リリース PR の自動作成と `main-source` はそのまま

## 検討した選択肢

| 選択肢 | 良い点 | 悪い点 |
| --- | --- | --- |
| **マージコミットだけを許す** (採用) | develop と main の履歴がつながり、揃える作業が要らない。main のツリーはリリース PR の head (develop の先頭) と同じになる | main の履歴に develop の個々のコミットが並ぶ |
| Squash のまま、リリース後に main を develop へ `-s ours` でマージするワークフローを足す | main の履歴が 1 リリース 1 コミットのまま | 仕組みが増える。ワークフローが develop に push する権限が要る |
| Squash のまま手で揃える (従来) | 何も変えなくてよい | 抜けると次のリリースで衝突する (実際に起きた) |

## 結果

- リリース PR は衝突しなくなり、マージ後に揃える作業が要らない
- main の「1 リリース 1 コミット」の見た目は無くなる。リリースごとの区切りはマージコミットと、リリース PR の本文の PR 一覧で追う
- ルールセットの変更は GitHub の画面か API で取り込むまで効かない (ADR 0007 と同じ)
