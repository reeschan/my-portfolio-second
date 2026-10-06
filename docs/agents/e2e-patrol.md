# E2E 定期巡回の手順

定期実行 (または「E2E を巡回して」という依頼) で、エージェントが行う手順。Claude Code / Codex / Kimi のどれが実行しても同じ結果になるように書いている。

**成果物は「実際に通るテストを足した PR」1 本。** 設計メモだけの PR は出さない。足すものがなければ PR を出さずに終わる。

## 0. 前提を読む

1. `AGENTS.md` (PBI 駆動の開発手順 `docs/agents/development-flow.md` のうち、巡回は PBI 不要)
2. `testing/e2e-policy.yml`。観点と `patrol:` の上限を確認する
3. `docs/adr/` の一覧と、状態が `提案中` のもの

## 1. 現状を把握する

```bash
pnpm install --frozen-lockfile
pnpm test:coverage-map          # ルート × 観点の表と「穴」
git log --since="14 days ago" --name-only --oneline -- app components lib data
```

## 2. 足すテストを選ぶ

次の優先順位で、最大 `patrol.max_new_tests_per_run` 本まで選ぶ。

1. `required: true` の観点の穴
2. 最近変更されたページやコンポーネントのうち、テストが変更に追いついていない部分
   - 例: 文言やボタンが増えたのに検証していない
3. `required: false` の観点の穴

穴でも「その観点がそのルートには当てはまらない」場合はテストを書かない。代わりに次のどちらかをする。

- `testing/e2e-policy.yml` の `routes` を絞る
- `exclude_routes` に理由付きで足す

この判断は PR 本文に書く。

## 3. テストを書く

- `AGENTS.md` の「テストの方針」に従う。要点は次のとおり
  - fixtures の `test` を使う
  - 観点タグと `routes()` を付ける
  - `getByRole` で要素を取る
  - LLM はモックする
- 既存のファイルに観点が合うものがあればそこに足す。なければ `e2e/<観点>.spec.ts` を作る
- **アプリ本体のコードは変更しない** (`patrol.allow_app_code_changes: false`)
  - バグを見つけたら、テストを `test.fixme()` にして理由をコメントに書く
  - そのバグは PR 本文の「見つけた問題」に書く
- テストのために `data-testid` が要りそうでも足さない。ロールで取れない要素は、それ自体を a11y の問題として報告する

## 4. 通ることを確かめる

```bash
pnpm typecheck
pnpm test:unit
pnpm test:e2e --repeat-each=3 <追加・変更したファイル>   # patrol.required_consecutive_passes 回連続で通ること
pnpm test:e2e                                             # 全体も通ること
pnpm test:coverage-map -- --write
```

コミットは `commit-gate` スキル (`git add` → `pnpm commit-gate` → `git commit`) を通す。巡回はテストだけの変更なので E2E 追加の条件には引っかからないが、全テストの合格は確かめられる。

- 3 回中 1 回でも落ちるテストはフレークとして PR に含めない (直せるなら直す)
- 本番ビルドが Google Fonts を取りに行けない環境では、playwright.config.ts が自動で dev サーバーを使う。そのまま回してよい

## 5. 新しい観点・道具が必要だと判断したとき

例えば次のような場合。

- 画像比較を入れたい
- a11y を必須にしたい
- API のスキーマ検証を足したい

このときは `docs/adr/template.md` から ADR を作り、状態を `提案中` にして同じ PR に入れる。

- `testing/e2e-policy.yml` の変更も同じ PR に含める
- 採用するかどうかはマージで決まる。巡回エージェントは ADR を `採用` にしない

## 6. PR を出す

- ブランチ名: `test/e2e-patrol-YYYYMMDD`
- タイトル: `test: E2E 巡回 YYYY-MM-DD (<観点の要約>)`
- 変更行数は `patrol.max_changed_lines` 以内。超えるなら優先度の低いものを次回に回す
- 本文に書くこと:
  - **追加したテスト**: ファイルと観点、何を確かめるか
  - **カバレッジ表の差分**: 穴がいくつ減ったか
  - **見つけた問題**: `test.fixme` にしたものと理由。なければ「なし」
  - **見送ったもの**: 対象外にした穴と理由、次回に回したもの
  - **検証**: 実行したコマンドと結果

足すべきものがなかった場合は PR を出さない。巡回結果 (表に穴がないこと) だけを報告して終わる。
