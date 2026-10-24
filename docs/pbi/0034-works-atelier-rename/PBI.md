# PBI-0034 /works の pbi-orchestration-jev を Atelier に改める

- 状態: 完了
- 起票日: 2026-10-24
- 依頼者: リポジトリの持ち主
- 作業記録: [WORK.md](WORK.md)
- 関連 ADR: なし

## 背景・目的

/works に載せている pbi-orchestration-jev が Atelier に改名され、リポジトリも reeschan/atelier に移った。中身も「PBI に分けてサブエージェントに渡すスキル」から「開発を 9 工程のワークフローテンプレートとして回すスキル (既定のテンプレートが PBI の振り分け)」に広がった。作品の名前・リンク・説明・アーキテクチャ図が古いままなので、今の Atelier に合わせる。

## やること

- `data/works.ts` と `data/en/works.ts` の作品を id `atelier` にし、名前・説明・使用技術・リポジトリの URL・図の代替テキスト・本文を今の README に合わせて書き直す
- 図を `public/works/atelier/` に移し、Atelier のリポジトリの `assets/architecture-{light,dark}.svg` (D2 で描き直し済み) に差し替える

## やらないこと

- 図をこのリポジトリで描き直すこと (正本は Atelier のリポジトリの `assets/architecture.d2`)
- 過去の PBI・仕様書に出てくる pbi-orchestration-jev の名前の書き換え (当時の記録なのでそのまま)

## 受け入れ条件

| # | 条件 | 確かめ方 |
| --- | --- | --- |
| 1 | 作品の id・名前・リンクが atelier / Atelier / https://github.com/reeschan/atelier になっている | `git grep pbi-orchestration-jev -- data public` が旧名の言及 (「旧 pbi-orchestration-jev」) だけを返す |
| 2 | 図がライト用・ダーク用とも `public/works/atelier/` にある | `pnpm test:unit` (test/data/works.test.ts) |
| 3 | 英語版にも同じ id の作品がある | `pnpm typecheck`、`pnpm test:unit` |
| 4 | CI と同じ確認が通る | `pnpm commit-gate` |
