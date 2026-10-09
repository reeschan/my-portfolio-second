# 0016. ユニットテストは test/ に同じ階層で置き、API の認証は decorator/ のデコレータで掛ける

- 状態: 提案中
- 日付: 2026-10-09
- 関連: [ADR 0001](0001-testing-strategy.md) (ユニットの置き場所を置き換える)、[ADR 0015](0015-now-posts-storage-and-markdown.md)、[PBI-0004](../pbi/0004-now-posts/PBI.md)

## 背景

- ユニットテストはソースの隣 (`lib/format.test.ts` など) に置いていた。ソースとテストが混ざり、`app/` の下にもテストが入っている
- /now の記事の API が POST・PUT・DELETE と増え、どれも同じトークンの検証が要る。ルートごとに検証を書くと、付け忘れたルートが素通しになる

## 決定

- **ユニットテスト (Vitest) はルートの `test/` に、ソースと同じ階層で置く**
  - `lib/now/store.ts` のテストは `test/lib/now/store.test.ts`、`app/api/now/[id]/route.ts` のテストは `test/app/api/now/[id]/route.test.ts`
  - テストからは `@/` でソースを import する (相対パスで `../../` を辿らない)
  - テスト用の道具 (テストではないもの) は `*.test.ts` にしない名前で隣に置く (例 `test/app/api/now/helpers.ts`)
  - `src/` は作らない。E2E (`e2e/`) と eval (`evals/`) の置き場所は変えない
- **認証の要る API は `decorator/` のデコレータで Route Handler を包む**
  - `withBearerAuth({ tokenEnv, realm }, handler)` が `Authorization: Bearer <トークン>` を環境変数の値と定数時間で比べ、通ったときだけ `handler` を呼ぶ。トークン未設定は 503、不一致は 401
  - JS のデコレータ構文 (`@`) はクラスにしか付かないので、関数を包む高階関数にする
  - 機能ごとの設定 (どの環境変数か) は機能の側に置く (例 `lib/now/auth.ts` の `nowWriteAuth`)

## 検討した選択肢

| 選択肢 | 良い点 | 悪い点 |
| --- | --- | --- |
| **test/ に同じ階層で置く** | ソースの一覧がすっきりする。テストの場所が機械的に決まる | ソースを動かすとテストも手で動かす |
| ソースの隣 (これまで) | 対応が一目でわかる | `app/` などにテストが混ざる |
| `src/` を作って `test/` と並べる | 一般的な構成 | すべての import と設定を書き換える大きな移動になる |
| 認証を middleware (proxy) で掛ける | ルートを書く人が忘れない | パスの一致で決めるので、守る範囲がルートのコードから見えない |
| ルートごとに検証を書く (これまで) | 単純 | 付け忘れが起きやすい |

## 結果

- `vitest.config.mts` の `include` を `test/**/*.test.ts(x)` にした。`pnpm test:coverage-map` とコミットゲートは `*.test.ts` を名前で見ているので変更不要
- `testing/e2e-policy.yml` の `tools.unit` と `api-contract` の説明を新しい置き場所に合わせた
- ルートを足すとき、認証が要るなら `export const POST = withBearerAuth(...)` と書く。デコレータ自体の検証は `test/decorator/with-bearer-auth.test.ts`
