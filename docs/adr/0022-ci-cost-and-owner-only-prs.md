# 0022. Actions の費用を抑える: E2E は develop へのマージ後だけ、PR は持ち主と Dependabot だけ

- 状態: 提案中
- 日付: 2026-10-10
- 関連: [PBI-0009](../pbi/0009-ci-cost-owner-only/PBI.md)、[ADR 0007](0007-ci-quality-gate.md)、[ADR 0021](0021-release-pr-and-main-source.md)、[ADR 0014](0014-formatter-and-repo-automation.md)

## 背景

E2E (Playwright) は CI でいちばん重いが、PR ごと・main への push ごとに回していた。
public リポジトリなので、他人の PR でも CI と CodeQL が動きうる。

## 決定

- PR (develop 向け) では lint・型・ユニット・ビルドだけを回し、E2E は回さない。E2E は develop へのマージ (push) で回す (`.github/workflows/test.yml`)
- release-pr は、develop への push の CI (E2E 込み) が成功したときだけリリース PR を作る・更新する。失敗したら作らず、直して develop に入れ直す (`.github/workflows/release-pr.yml`、`workflow_run`)
- main への push では CI を回さない
- PR の CI と CodeQL は、作成者が持ち主・`dependabot[bot]`・`github-actions[bot]` (このリポジトリの release-pr が作るリリース PR) のときだけ動く。それ以外の PR は `pr-author-gate` (`.github/workflows/pr-author-gate.yml`、`pull_request_target`) がコメントを付けて自動で閉じる
- リポジトリの設定で、フォークからの PR のワークフローは外部の投稿者すべてについて承認を要るようにした (Settings → Actions → General → Fork pull request workflows。持ち主がマージ後に API で設定する)
- リリース PR の必須チェック `ci-ok` は、develop への push の CI の結果 (E2E 込み) がコミットに付いて満たされる
  - `ci-ok` が e2e のスキップを許すのは PR のときだけ
- release-pr は、CI が検証したコミットがいまの develop の先頭でなければ何もしない (古い結果でリリース PR を更新しない)

## 検討した選択肢

| 選択肢 | 良い点 | 悪い点 |
| --- | --- | --- |
| **PR では E2E を回さず、develop の push で回してからリリース PR** (採用) | 費用が PR の数に比例しない | 壊れた変更が develop に入りうる。入ったらリリース PR を作らず直す |
| PR ごとに E2E を回す (従来) | develop が壊れない | 費用が PR の数に比例する |
| E2E を手動実行だけにする | 費用が最小 | 回し忘れる |
| 他人の PR を GitHub の設定で禁止する | 確実 | public リポジトリでは恒久的に禁止する設定が無い。インタラクション制限は最長 6 か月 |

## 結果

- develop が E2E で壊れることがある。その間はリリース PR が更新されず、開いているリリース PR も `ci-ok` が失敗するのでマージできない
- Dependabot の PR は E2E なしでマージされ、develop で E2E が回る
- `pull_request_target` のワークフローは PR のコードを読まない・実行しない約束で書く
