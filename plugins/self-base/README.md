# self-base (Self 組織のベーステンプレート)

どのリポジトリでも同じ型で開発を進めるための Claude Code プラグイン。このリポジトリの `.claude-plugin/marketplace.json` が `self` マーケットプレイス (= Self 組織) を定義していて、このプラグインはその 1 つ目。

| スキル | 呼び方 | 役割 |
| --- | --- | --- |
| start-pbi | `/self-base:start-pbi` | 依頼を PBI (何を・なぜ・完了条件) と WORK (作業計画と記録) に起こしてから着手する |
| create-pr | `/self-base:create-pr` | PBI・WORK・ADR・テスト結果を束ねて PR を作る |

## 前提にしているリポジトリの形

スキルは次の場所を見る。無いものは飛ばすので、テンプレートとして新しいリポジトリに持ち込むときは、必要なものだけ用意すればよい。

| 場所 | 役割 | このリポジトリでの例 |
| --- | --- | --- |
| `AGENTS.md` | エージェント向けの指示の入口 | あり |
| `docs/agents/development-flow.md` | PBI 駆動の開発手順 | あり |
| `docs/pbi/<番号>-<slug>/PBI.md`, `WORK.md` | PBI と作業記録 | `docs/pbi/0001-base-foundation/` |
| `docs/adr/` | 設計判断の記録 | あり |
| `.github/pull_request_template.md` | PR 本文の型 | あり |
| `pnpm commit-gate` など | コミット前の検査 | あり (`.claude/skills/commit-gate/`) |

## 使えるようにする

このリポジトリでは `.claude/settings.json` で自動的に有効になる (`extraKnownMarketplaces` と `enabledPlugins`)。

別のリポジトリから使うときは、そのリポジトリの `.claude/settings.json` に次を足す。

```json
{
  "extraKnownMarketplaces": {
    "self": { "source": { "source": "github", "repo": "reeschan/my-portfolio-second" } }
  },
  "enabledPlugins": { "self-base@self": true }
}
```

Self 組織のリポジトリを別に作ってプラグインを移す場合は、`repo` をそちらに変えるだけでよい (スキルの中身はリポジトリに依存しない書き方にしてある)。

## 変更するとき

- スキルはリポジトリ固有の事情を書かない。固有の手順は各リポジトリの `AGENTS.md` や `docs/agents/` に書き、スキルからはそれを読みに行く
- 版を上げたら `plugin.json` と `marketplace.json` の `version` を揃える
- `claude plugin validate .` で形式を確かめる
