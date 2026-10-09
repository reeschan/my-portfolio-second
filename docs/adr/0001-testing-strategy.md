# 0001. テスト戦略: Playwright + Vitest、観点は方針ファイルで管理する

- 状態: 採用
- 日付: 2026-10-01

## 背景

これまでテストも CI もなかった。今後は複数の AI コーディングエージェント (Claude Code / Codex / Kimi) にも改修やテスト追加を任せる。

そのため次の 3 点が必要になる。

- どのエージェントが書いても同じ書き方・同じ観点になること
- 足りていない観点を人が探さなくても機械的に見つけられること
- 外部 LLM (Moonshot API) を誤ってテストから呼ばないこと

## 決定

1. **E2E は Playwright、ユニット・API は Vitest** を使う
   - E2E は `e2e/`、ユニットはソースの隣 (`*.test.ts`) に置く (→ ユニットの置き場所は [ADR 0016](0016-test-directory-and-auth-decorator.md) で `test/` に変えた)
2. **テスト観点の正本を `testing/e2e-policy.yml` に置く**
   - 観点ごとに `enabled` / `required` / 対象ルートを宣言する
   - 観点の追加・無効化はこのファイルの変更で行う
3. **各テストに観点タグと対象ルートを付け、`scripts/e2e-coverage.mjs` で「ルート × 観点」の表を作る**
   - `required: true` の観点に穴があれば CI を落とす
   - 表は `docs/testing/coverage-map.md` に出す
4. **外部 LLM は常にモックする**
   - E2E はブラウザ側で `/api/chat` を差し替え、ユニットは `fetch` をモックする
   - E2E のサーバーは `MOONSHOT_API_KEY` を空で起動する
5. **エージェント向けの指示は `AGENTS.md` に集約する**
   - `CLAUDE.md` は `@AGENTS.md` を読み込むだけにする
   - 定期巡回の手順は `docs/agents/e2e-patrol.md` に置く
6. **E2E では全テストで console エラーと未捕捉例外を検出する** (`e2e/fixtures.ts` の自動フィクスチャ)

## 検討した選択肢

| 選択肢 | 良い点 | 悪い点 |
| --- | --- | --- |
| Playwright + Vitest (採用) | Next.js と相性がよく、タグ・annotation で観点を機械的に扱える。スマホ幅の確認も同じテストで回せる | 依存が 2 つ増える |
| Cypress | GUI でのデバッグがしやすい | タグやプロジェクト分割の仕組みが弱く、並列実行に有料機能が絡む |
| 観点を ADR やドキュメントだけで管理 | 道具が要らない | 読まれなくなりやすく、穴を機械的に検出できない |
| 画像比較テスト (visual regression) も最初から入れる | 見た目の崩れを拾える | 3D 背景とアニメーションで毎回画面が変わり、不安定になる。今回は見送る |

## 結果

- `pnpm test:unit` / `pnpm test:e2e` / `pnpm test:coverage-map` で、手元でも CI でも同じ確認ができる
- 観点を増やすときは方針ファイルを変え、必要なら ADR を足す
- エージェントは `AGENTS.md` → 方針ファイル → カバレッジ表の順に読めば、何を足すべきか分かる
- 本番ビルドは Google Fonts を取得するため、ネットワークを制限した環境ではビルドが失敗する
  - その環境では `pnpm dev` で E2E を回す (playwright.config.ts が CI 以外では dev サーバーを使う)
