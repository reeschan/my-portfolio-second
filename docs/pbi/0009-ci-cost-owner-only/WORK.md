# WORK-0009 Actions の費用を抑える: E2E は develop へのマージ後だけ、PR は持ち主と Dependabot だけ

PBI: [PBI.md](PBI.md)

## 計画

- [x] `.github/workflows/test.yml`・`codeql.yml`: PR は E2E なし、作成者で絞る、main への push で回さない
- [x] `.github/workflows/pr-author-gate.yml`: 持ち主と Dependabot 以外の PR を閉じる
- [x] `.github/workflows/release-pr.yml`: develop の CI の成功で動く (workflow_run)
- [x] ADR 0022、ADR 0021・0007、AGENTS.md・README の更新
- [ ] (マージ後) フォークからの PR のワークフローの承認を「外部の投稿者すべて」にする
- [ ] (マージ後) develop の CI で E2E が動き、成功したあとにリリース PR が更新されることを確かめる

## ADR が要る判断

- [ADR 0022](../../adr/0022-ci-cost-and-owner-only-prs.md): E2E を develop へのマージ後だけにすることと、PR を持ち主と Dependabot に限ること

## 記録

- 2026-10-10: public リポジトリでは他人の PR の作成を恒久的に禁止する設定が無い (インタラクション制限は最長 6 か月)。開かれたら自動で閉じ、それまでの間も CI のジョブを動かさない
- 2026-10-10: Dependabot の PR は受け付ける (持ち主の判断)。PR では E2E を回さないので、費用は lint・型・ユニット・ビルドの分だけ
- 2026-10-10: 作成者の判定は、先頭の軽いジョブ `authorized` を if で絞り、ほかのジョブを needs でつなぐ。スキップは needs で後ろに伝わる
- 2026-10-10: main への push の CI はやめる。main に入るのはリリース PR の head (develop の先頭) で、E2E 込みの ci-ok がそのコミットで通っている。main は Squash でマージするのでツリーは同じ
- 2026-10-10: リリース PR の作成者は github-actions[bot]。作成時は GITHUB_TOKEN のイベントなので PR のワークフローは起動しないが、手で開き直すと pr-author-gate に閉じられ、CI もスキップされる。github-actions[bot] も許可した (このリポジトリの GITHUB_TOKEN でしかその名前で PR を作れない)
- 2026-10-10: 手元の commit-gate で、背景テーマの E2E がページ移動後の表示待ち (expect の既定 5 秒) で 2 回続けて落ちた (単独なら通る)。巡回など別のテストでも同じ揺れが出ていたので、手元 (dev サーバー) のときだけ expect の上限を 15 秒にした。CI は 5 秒のまま

## 検証

```
pnpm commit-gate
```
