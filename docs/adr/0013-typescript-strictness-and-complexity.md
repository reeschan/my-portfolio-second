# 0013. TypeScript の厳格化: 添字アクセスの検査・型情報つき lint・循環的複雑度の上限・外部入力のスキーマ

- 状態: 採用
- 日付: 2026-10-09
- 関連: [PBI-0003](../pbi/0003-code-quality-gates/PBI.md)、[ADR 0007](0007-ci-quality-gate.md)

## 背景

`strict: true` と Next.js 推奨の ESLint だけでは、次の 3 つが素通りしていた。

- 配列・型付き配列の添字アクセスが `T` 扱いになり、範囲外の `undefined` を型で拾えない
- `JSON.parse` や `res.json()` の戻り値 (`any`) が、そのままプロパティを読まれて流れていく。チャット API は入力を手書きで絞り込んでいて長い
- 1 つの関数に分岐が集まっても気づけない (チャット API の `parseMessages` は循環的複雑度 17、月面の地形生成は 15 だった)

## 決定

1. `tsconfig.json` に `noUncheckedIndexedAccess`・`noImplicitOverride`・`noFallthroughCasesInSwitch` を足し、`target` を `ES2022` に上げる
2. ESLint に `typescript-eslint` の `recommendedTypeCheckedOnly` を `.ts` / `.tsx` / `.mts` だけに足す (`projectService` で tsconfig を読む)
3. ESLint の `complexity` を **error・上限 10** で全ファイルにかける。超えたら関数を分ける。上限 10 は McCabe が示した目安で、ESLint の既定 (20) より厳しい
4. 外から来る JSON (チャット API のリクエスト、LLM の SSE、eval の LLM 応答と YAML) は `zod` のスキーマで検証し、型はスキーマから得る。画面側 (クライアント) では zod を読み込まず、小さな型ガードで済ませる

違反は `pnpm lint` (CI の lint ジョブ) で落ちるので、上限を超えた関数はマージできない。

## 検討した選択肢

| 選択肢 | 良い点 | 悪い点 |
| --- | --- | --- |
| complexity を error・上限 10 (採用) | 追加の道具が要らず、既存の lint ジョブで止まる | JSX の三項演算子や `?.` も 1 と数えるので、表示部品で少し窮屈 |
| complexity を warn で入れる | 既存コードを直さずに入れられる | 警告は読まれずに積み上がり、止める仕組みにならない |
| SonarJS の cognitive-complexity | ネストを重く数え、読みにくさに近い | プラグインが増える。依頼は循環的複雑度 |
| `strictTypeChecked` まで上げる | より多くを検出する | 非 null 表明の禁止などで既存の three.js のコードの修正が大きい。まず推奨セットで様子を見る |
| 入力検証を手書きのまま | 依存が増えない | 検証と型が別々に書かれ、ずれる |

## 結果

- 型エラー 39 件・lint 違反 34 件を直した。複雑度の高い 8 関数は、振る舞いを変えずに小さな関数へ分けた
- 添字アクセスに `?? 0` や事前の取り出しが増える。three.js の型付き配列への加算は `addAt()` にまとめた
- `zod` が本番の依存に増える (サーバー側と eval だけで使う)
