# PBI-0003 型の厳格化・循環的複雑度の上限・ワークフローの整備

- 状態: 進行中
- 起票日: 2026-10-09
- 依頼者: リポジトリの持ち主
- 作業記録: [WORK.md](WORK.md)
- 関連 ADR: [0013](../../adr/0013-typescript-strictness-and-complexity.md)、[0014](../../adr/0014-formatter-and-repo-automation.md)

## 背景・目的

リポジトリの見直しで、TypeScript の書き方とワークフローに上げられる余地が見つかった。型で拾えない `undefined` や `any`、分岐の多い関数、書式の揺れ、依存更新とセキュリティ検査の不在を、CI で止まる形にして品質を保つ。

## やること

- tsconfig を厳しくし (`noUncheckedIndexedAccess` など)、出た型エラーを直す
- 型情報つきの ESLint ルールを入れ、違反を直す
- 循環的複雑度を測り、上限 (10) を超えたら lint で落とす。超えている関数を分ける
- チャット API と eval の外部入力の検証を zod のスキーマにする
- Prettier を入れ、CI で書式を検査する
- Dependabot (npm・GitHub Actions) と CodeQL を入れる
- CI の共通の準備 (checkout 以外の pnpm・Node・install) を composite action にまとめる

## やらないこと

- 画面の見た目・振る舞いの変更
- `strictTypeChecked` や `exactOptionalPropertyTypes` (修正量が大きく、効果を見てから)
- チャットのシステムプロンプトの変更 (eval は不要)

## 受け入れ条件

| # | 条件 | 確かめ方 |
| --- | --- | --- |
| 1 | tsconfig に `noUncheckedIndexedAccess` が入り、型チェックが通る | `pnpm typecheck` |
| 2 | 循環的複雑度が 10 を超える関数があると lint が失敗する | `pnpm lint` (`complexity: error, max 10`)。上限を超えた関数を書くと落ちることを手元で確認 |
| 3 | 型情報つきルールで lint が通る | `pnpm lint` |
| 4 | チャット API の入力検証の振る舞いが変わらない | `app/api/chat/route.test.ts` (既存)、`lib/chat/schema.test.ts` (@api-contract) |
| 5 | 書式が揃っていないと CI が落ちる | `pnpm format:check` を CI の lint ジョブで実行 |
| 6 | Dependabot と CodeQL の設定がある | `.github/dependabot.yml`、`.github/workflows/codeql.yml` |
| 7 | 画面の振る舞いが変わらない | `pnpm test:e2e` が全件通る |
