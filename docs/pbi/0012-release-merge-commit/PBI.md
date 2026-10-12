# PBI-0012 リリース PR (develop → main) はマージコミットで入れ、毎回の衝突をなくす

- 状態: 進行中
- 起票日: 2026-10-13
- 依頼者: リポジトリの持ち主
- 作業記録: [WORK.md](WORK.md)
- 関連 ADR: [ADR 0025](../../adr/0025-release-pr-merge-commit.md)

## 背景・目的

main はリリース PR を Squash and merge でだけ更新している。Squash のコミットは develop の履歴に入らないので、次のリリース PR で前回と同じ変更が main 側にもあると見なされ、大量に衝突する (2026-10-13 のリリース PR #30 で 41 ファイル)。
「squash 後は main を develop にマージして揃える」という手順はあったが、手で行うので抜けた。リリース PR をマージコミットで入れて、develop と main の履歴をつなげ、揃える作業をなくす。

## やること

- main のルールセットで許すマージの方法を Squash からマージコミットに変える
- リリース PR の本文のチェック項目を、マージコミットでマージする形に直す (揃える手順の項目は消す)
- AGENTS.md・README・CI の説明と ADR を合わせる

## やらないこと

- GitHub 上のルールセットへの取り込み (持ち主が Settings → Rules → Rulesets で行う。ADR 0007)
- develop 側のブランチ保護の追加
- 過去の Squash のコミットの書き換え (2026-10-13 に main を develop へ `-s ours` でマージして履歴を揃え済み)

## 受け入れ条件

| # | 条件 | 確かめ方 |
| --- | --- | --- |
| 1 | ルールセットの `allowed_merge_methods` が `["merge"]` | `.github/rulesets/main.json` |
| 2 | リリース PR の本文に「Create a merge commit でマージする」があり、Squash と「main を develop にマージして揃える」の項目が無い | test/scripts/release-pr.test.ts |
| 3 | AGENTS.md・README・test.yml に「Squash でマージする」前提の説明が残っていない | `git grep -n -i squash -- AGENTS.md README.md .github scripts test` |
