# PBI-0008 develop → main のリリース PR を自動で作り、main への PR は develop からだけ受け付ける

- 状態: 進行中
- 起票日: 2026-10-10
- 依頼者: リポジトリの持ち主
- 作業記録: [WORK.md](WORK.md)
- 関連 ADR: [0021](../../adr/0021-release-pr-and-main-source.md)、[0007](../../adr/0007-ci-quality-gate.md)

## 背景・目的

main は develop → main の PR (Squash and merge のみ) でだけ更新する決まりだが、その PR は手で作っていて、何が入るかを本文にまとめる手間がある。
また、機能ブランチから main に直接 PR を出してもマージできてしまう。
リリース PR を自動で作って含まれる PR の一覧を本文に載せ、main に入れられるのを develop からの PR だけにする。

## やること

- `release-pr` ワークフロー: develop への push と手動実行で、develop → main の PR を作る (開いていれば本文とタイトルを更新する)
  - 本文は前回のリリース以降に develop にマージされた PR の一覧と、各 PR の「## 概要」の 1 行目
- 必須チェック `main-source`: main 向けの PR の head が同じリポジトリの develop でなければ失敗する。main のルールセットの必須チェックに足す
- ADR 0021 と AGENTS.md・README の運用の記述

## やらないこと

- GitHub 上のルールセットの取り込み (マージ後、持ち主の確認のうえで行う)
- マージの自動化、main を develop に戻す同期の自動化
- リポジトリの Squash のコミットメッセージの設定の変更

## 受け入れ条件

| # | 条件 | 確かめ方 |
| --- | --- | --- |
| 1 | 本文が前回のリリース以降の PR の一覧・概要・件数・差分のリンク・チェックリストを含む | test/scripts/release-pr.test.ts |
| 2 | main との差分が無ければリリース PR を作らない。開いていれば作り直さず更新する | scripts/release-pr.mjs (レビュー)、マージ後の実際の動き |
| 3 | main 向けの PR は develop 以外からだと `main-source` が失敗する | .github/workflows/main-source.yml (レビュー)、マージ後に試す |
| 4 | ルールセットの定義で、必須チェックが `ci-ok` と `main-source` の 2 つ | .github/rulesets/main.json |
