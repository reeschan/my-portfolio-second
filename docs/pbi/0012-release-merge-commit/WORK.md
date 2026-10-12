# WORK-0012 リリース PR (develop → main) はマージコミットで入れ、毎回の衝突をなくす

PBI: [PBI.md](PBI.md)

## 計画

- [x] ルールセットの `allowed_merge_methods` を `["merge"]` にする — main.json
- [x] リリース PR の本文のチェック項目を直す — release-pr.test.ts が通る
- [x] AGENTS.md・README・test.yml の説明と ADR 0021 の追記 — Squash 前提の説明が残らない
- [ ] GitHub 上のルールセットに取り込む — 持ち主が行う

## ADR が要る判断

- リリース PR のマージの方法: [ADR 0025](../../adr/0025-release-pr-merge-commit.md)

## 記録

- 2026-10-13: リリース PR #30 が 41 ファイルで衝突した。main にだけあるのは #28 の Squash のコミット 1 つで、そのツリーは develop の ba960b4 と同じだった。main を develop に `git merge -s ours` でマージして履歴を揃え、#30 は衝突しなくなった
- 2026-10-13: 再発を防ぐため、リリース PR はマージコミットで入れることにした。許す方法は `merge` だけにし、うっかり Squash するのを防ぐ

## 検証

```
pnpm commit-gate
```
