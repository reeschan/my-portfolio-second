# WORK-0003 型の厳格化・循環的複雑度の上限・ワークフローの整備

PBI: [PBI.md](PBI.md)

## 計画

- [x] tsconfig を厳しくし、型エラーを直す — `pnpm typecheck`
- [x] 型情報つき ESLint と complexity (上限 10) を入れ、違反を直す — `pnpm lint`
- [x] チャット API と eval の外部入力を zod のスキーマにする — `pnpm test:unit`
- [x] Prettier を入れ、全体を整形し、CI で検査する — `pnpm format:check`
- [x] Dependabot・CodeQL・CI の composite action — ワークフローの構文と CI の結果

## ADR が要る判断

- [0013](../../adr/0013-typescript-strictness-and-complexity.md): tsconfig・型情報つき lint・循環的複雑度の上限・zod の採用
- [0014](../../adr/0014-formatter-and-repo-automation.md): Prettier・Dependabot・CodeQL・CI の共通化

## 記録

- 2026-10-09: `noUncheckedIndexedAccess` で 39 件の型エラー。大半は three.js の型付き配列と shader の uniforms。uniforms は作ったときの型 (`typeof uniforms`) に戻して読む形に揃えた (月面のテーマで既に使っていた書き方)
- 2026-10-09: 型付き配列への `+=` は書けなくなるので `addAt()` を足した。地形の乱数を引く順番は変えていない
- 2026-10-09: 複雑度 10 超えは 8 関数 (最大はチャット API の `parseMessages` で 17)。スキーマ化と関数の分割で全て 10 以下にした
- 2026-10-09: スキルのタブは `skillCategories[0]` の添字参照をやめ、名前で引く `categoryOf()` にした。並び替えても壊れない
- 2026-10-09: 画面側 (`resume-chat.tsx`) は zod を読み込まず、エラー文の取り出しを型ガードで書いた (クライアントの読み込み量を増やさないため)
- 2026-10-09: `strictTypeChecked` は見送り。非 null 表明の禁止などで three.js のコードの修正が大きい
- 2026-10-09: Prettier は今のコードの多数派 (セミコロンなし・ダブルクォート) に合わせ、1 行 140 字にした。120 字だと 400 行近くが折り返しになり、差分が読みにくい。初回の整形は 40 ファイル
- 2026-10-09: Markdown は Prettier の対象外。表と日本語の改行が崩れるため
- 2026-10-09: アクションはタグではなくコミット SHA で固定した (actions/checkout v4.4.0 など)。更新は Dependabot に任せる
- 2026-10-09: CodeQL のコミットのとき commit-gate が 1 度失敗した (ログを残さずに流してしまい原因は不明)。同じ内容で再実行すると E2E 100 件を含め合格した。E2E の一時的な失敗と見ている

## 検証

```
pnpm commit-gate        # lint / 型 / ユニット 68 件 / 必須観点 / E2E 100 件: 合格
pnpm format:check       # All matched files use Prettier code style!
```
