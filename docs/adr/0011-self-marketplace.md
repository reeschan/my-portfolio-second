# 0011. 共有スキルを Self 組織のプラグインマーケットプレイスで配る

- 状態: 採用
- 日付: 2026-10-06
- 関連: PBI-0001、0010、[plugins/self-base/README.md](../../plugins/self-base/README.md)

## 背景

PBI の起票や PR の作成の手順は、このリポジトリに限らず、今後作るリポジトリでも同じ型で回したい。
`.claude/skills/` に置くとそのリポジトリでしか使えず、コピーすると内容がずれていく。

## 決定

1. Claude Code の **プラグインマーケットプレイス**として **`self`** (Self 組織) を作る: `.claude-plugin/marketplace.json`
2. 1 つ目のプラグインとして **`self-base`** (ベーステンプレート) を置く: `plugins/self-base/`
   - `start-pbi`: PBI と WORK を起こす
   - `create-pr`: PBI・WORK・ADR・テスト結果を束ねて PR を作る
3. このリポジトリでは `.claude/settings.json` の `extraKnownMarketplaces` (ディレクトリ指定) と `enabledPlugins` で自動的に有効にする
4. スキルにはリポジトリ固有の事情を書かない。固有の手順は各リポジトリの `AGENTS.md` / `docs/agents/` に書き、スキルはそれを読みに行く
5. リポジトリ固有のスキル (`e2e-patrol`、`commit-gate`) は従来どおり `.claude/skills/` に置く

## 検討した選択肢

| 選択肢 | 良い点 | 悪い点 |
| --- | --- | --- |
| このリポジトリにマーケットプレイスを同居 (採用) | すぐ使え、変更を同じ PR でレビューできる | 他のリポジトリからはこのリポジトリを参照することになる |
| Self 組織用の専用リポジトリを作る | 責務がはっきりする | 今はスキルが 2 つしかなく、管理するリポジトリが増える |
| `.claude/skills/` にコピー | 仕組みが単純 | リポジトリごとに内容がずれる |

## 結果

- 他のリポジトリは `extraKnownMarketplaces` に `self` を足すだけで同じスキルを使える
- スキルが増えたら専用リポジトリ (GitHub 上の Self 組織など) に移す。移すときは `source` を変えるだけで済む
