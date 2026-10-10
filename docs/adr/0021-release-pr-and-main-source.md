# 0021. develop → main はリリース PR を自動で作り、main への PR は develop からだけ受け付ける

- 状態: 提案中
- 日付: 2026-10-10
- 関連: [PBI-0008](../pbi/0008-release-pr/PBI.md)、[ADR 0007](0007-ci-quality-gate.md)、[ADR 0014](0014-formatter-and-repo-automation.md)

## 背景

main は develop → main の PR (Squash のみ) でだけ更新する決まりだが、PR は手で作っていて、何が入るかを本文にまとめる手間がある。
また機能ブランチから main に直接 PR を出してもマージできた。

## 決定

- develop への push の CI (E2E 込み) が成功したときと手動実行で `release-pr` ワークフローが動き、develop → main の PR を作る。開いていれば本文とタイトルを更新する
  - タイトルは `release: develop → main (YYYY-MM-DD)`
- 本文は前回のリリース (develop → main の最後のマージ) 以降に develop にマージされた PR の一覧にする
  - 各 PR の「## 概要」の 1 行目を添える
  - main を develop に戻す同期の PR は除く
  - main との差分が無ければ PR を作らない
- 依存を足さず、Node の fetch で GitHub API を呼ぶ (`scripts/release-pr.mjs`)。本文の組み立ては純粋関数にしてユニットテストする
- 必須チェック `main-source` (`.github/workflows/main-source.yml`) を main のルールセットに足す。main 向けの PR の head が同じリポジトリの develop でなければ失敗する
- `GITHUB_TOKEN` で作った PR では pull_request のワークフローが起動しないので、develop への push でも `main-source` を成功させる
  - チェックはコミットに付くため、develop の先頭のコミットに付いた成功がリリース PR を通す
  - `ci-ok` も develop への push で走っている
- マージは従来どおり Squash and merge のみ (ルールセットの `allowed_merge_methods`)

## 検討した選択肢

| 選択肢 | 良い点 | 悪い点 |
| --- | --- | --- |
| **GITHUB_TOKEN で作り、push でも `main-source` を成功させる** (採用) | 秘密を増やさない | チェックの仕組みが少し込み入る |
| PAT や GitHub App のトークンで PR を作る | pull_request のワークフローが普通に動く | 長く生きる秘密を管理することになる |
| 既製のアクション (release-drafter など) | 設定だけで済む | GitHub Release 向けで、PR 本文の更新とは目的が違う。依存のアクションが増える |
| ルールセットだけで head を制限する | 仕組みが単純 | GitHub のルールセットには「PR の元のブランチ」を条件にするルールが無い |

## 結果

- リリース PR は develop の更新のたびに最新の一覧になる
- main に入れられるのは develop の内容だけになる
- ルールセットの変更は GitHub の画面か API で取り込むまで効かない (ADR 0007 と同じ)
- リリース PR を作り直したいときは Actions の `release-pr` を手動で実行する
- release-pr が GITHUB_TOKEN で PR を作るには、リポジトリの Settings → Actions → General → Workflow permissions の「Allow GitHub Actions to create and approve pull requests」を有効にする必要がある (無効だと PR の作成が 403 になる)。ルールセットの承認数は 0 なので、Actions が承認できることで増える権限は実質ない
- リリース PR を作るきっかけは ADR 0022 で「develop の CI の成功」に変えた
