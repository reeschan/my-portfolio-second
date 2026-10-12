# PBI-0009 Actions の費用を抑える: E2E は develop へのマージ後だけ、PR は持ち主と Dependabot だけ

- 状態: 進行中
- 起票日: 2026-10-10
- 依頼者: リポジトリの持ち主
- 作業記録: [WORK.md](WORK.md)
- 関連 ADR: [0022](../../adr/0022-ci-cost-and-owner-only-prs.md)、[0021](../../adr/0021-release-pr-and-main-source.md)、[0007](../../adr/0007-ci-quality-gate.md)

## 背景・目的

E2E (Playwright) は CI でいちばん重く、PR ごとと main への push ごとに回していて、GitHub Actions の費用がかさむ。
また public リポジトリなので、他人の PR でも CI と CodeQL が動きうる。
E2E は develop へのマージ後に 1 回だけ回し、成功したときだけリリース PR を作る。PR は持ち主と Dependabot のものだけを受け付ける。

## やること

- PR (develop 向け) の CI は lint・型・ユニット・ビルドだけ。E2E は develop への push で回す
- main への push では CI を回さない
- release-pr は develop の CI (E2E 込み) が成功したときだけリリース PR を作る・更新する
- PR の CI と CodeQL は、作成者が持ち主か Dependabot のときだけ動かす
- 持ち主と Dependabot 以外の PR は `pr-author-gate` が自動で閉じる
- フォークからの PR のワークフローは、外部の投稿者すべてについて承認を要るようにする (リポジトリ設定)
- ADR 0022 と運用の文書

## やらないこと

- E2E の中身・数の見直し
- develop のブランチ保護 (ルールセット) の追加
- Issue の受付の設定

## 受け入れ条件

| # | 条件 | 確かめ方 |
| --- | --- | --- |
| 1 | PR の CI で E2E が動かず、ci-ok が通る。develop への push では E2E まで動く | test.yml の構成チェックと ci-ok の判定の 6 ケース (.pbi-orch の道具)、この PR とマージ後の実際の動き |
| 2 | 持ち主と Dependabot 以外の PR では CI・CodeQL のジョブが動かず、PR は自動で閉じる | test.yml・codeql.yml・pr-author-gate.yml の構成チェック (レビュー) |
| 3 | release-pr は develop の CI の成功のあとだけ動き、古い結果では何もしない | release-pr.yml の構成チェック、マージ後の実際の動き |
| 4 | フォークからの PR のワークフローに承認が要る | リポジトリ設定 (`approval_policy: all_external_contributors`) |
