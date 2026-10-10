# WORK-0008 develop → main のリリース PR を自動で作り、main への PR は develop からだけ受け付ける

PBI: [PBI.md](PBI.md)

## 計画

- [x] `scripts/release-pr.mjs` と `.github/workflows/release-pr.yml` — test/scripts/release-pr.test.ts
- [x] `.github/workflows/main-source.yml` と `.github/rulesets/main.json` の必須チェック
- [x] ADR 0021、AGENTS.md・README の更新
- [x] GitHub 上の main のルールセットに `main-source` を足し、Actions に PR の作成を許可する
- [ ] (マージ後) 最初のリリース PR ができ、本文に PR の一覧が載ることを確かめる

## ADR が要る判断

- [ADR 0021](../../adr/0021-release-pr-and-main-source.md): リリース PR の自動作成と、main への PR の元を develop に限ること

## 記録

- 2026-10-10: リリース PR は GITHUB_TOKEN で作る。PAT や GitHub App は長く生きる秘密を増やすので使わない
- 2026-10-10: GITHUB_TOKEN で作った PR では pull_request のワークフローが起動しない。チェックはコミットに付くので、develop への push でも `main-source` を成功させ、develop の先頭のコミットに付いた成功でリリース PR を通す。`ci-ok` も develop への push で走っている
- 2026-10-10: GitHub のルールセットには「PR の元のブランチ」を条件にするルールが無いので、必須チェックで制限する
- 2026-10-10: 前回のリリースは「develop → main の最後にマージされた PR」の時刻で決める。main は Squash でマージするので、コミットの比較では develop の PR を絞り込めない
- 2026-10-10: リポジトリの「Allow GitHub Actions to create and approve pull requests」が無効だった (can_approve_pull_request_reviews: false)。このままでは release-pr の PR 作成が 403 になるので、マージ後にルールセットと合わせて持ち主の確認のうえ有効にする
- 2026-10-10: CodeQL (js/incomplete-multi-character-sanitization) が、概要の抽出で HTML コメントを 1 回の置換で消している点を指摘した。変わらなくなるまで消し、閉じていない <!-- から後ろは捨てるようにした。本文は GitHub 側でもサニタイズされるので実害はほぼ無いが、指摘を残さない
- 2026-10-10: 持ち主の依頼で GitHub 上の main のルールセットに main-source を足した (今の設定を取得し、必須チェックと名前だけを変えて PUT。ほかの既定値は変えていない)。持ち主が Actions に PR の作成を許可した

## 検証

```
pnpm commit-gate
```
