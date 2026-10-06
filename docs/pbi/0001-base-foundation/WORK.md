# WORK-0001 ベース実装の整備

PBI: [PBI.md](PBI.md)

## 計画

- [x] テーマのトークンを globals.css に明文化する — e2e/theme.spec.ts、docs/design/theme.md
- [x] 共通コンポーネント (ui/Badge、common/*) を作り、layout / features に分けて画面を組み直す — 既存の E2E が変更なしで通る
- [x] 表示データを data/ (career, skills, works) に出す — e2e/content.spec.ts が data/ と突き合わせて通る
- [x] E2E を足す (content / theme / interaction / navigation / chat) — カバレッジ表の穴 0、追加分が 3 回連続で通る
- [x] ADR 0002〜0011 を書く — docs/adr/README.md の一覧
- [x] PBI 駆動の手順と雛形 — docs/agents/development-flow.md、docs/pbi/_template/
- [x] Self マーケットプレイスと self-base プラグイン (start-pbi、create-pr) — `claude plugin validate`
- [x] README に概要とアーキテクチャ図 — README.md (Mermaid)
- [x] プライバシー eval (cases / score / run / success) — score.test.ts、`pnpm eval:privacy --dry-run`
- [x] CI を lint / typecheck / unit / build / e2e / ci-ok に分け、ルールセットを用意 — workflow、.github/rulesets/main.json
- [x] commit-gate (スクリプト・スキル・フック) — commit-gate-match.test.ts、この PBI のコミットで実際に通す

## ADR が要る判断

- 0002 / 0003 / 0006: 既存の技術選定の後付けの記録
- 0004: テーマのトークン化 / 0005: コンポーネントの層 / 0007: CI の品質ゲート / 0008: LLM とプライバシー eval / 0009: コミットゲート / 0010: PBI 駆動 / 0011: Self マーケットプレイス

## 記録

- 2026-10-06: テーマは「今の見た目を変えない」ことを優先し、HSL のチャンネル値のまま明文化した。recharts が `hsl(var(--x))` で直接読んでいるため OKLCH への移行は見送り (ADR 0004)
- 2026-10-06: アーキテクチャ図の `blue/green/purple-500` と RSS の `orange-500` をトークン (`chart-1`〜`4`、`rss`) に置き換えた。three.js の直書きの色は `lib/theme.ts` に集めた
- 2026-10-06: 作品カードが `div` の `onClick` でキーボード操作できなかったため、見出しの中のボタンをカード全体に広げる形 (WorkCard) にした。既存の E2E は見出しをクリックしていたので、そのまま通る
- 2026-10-06: スキルのタブが「非制御 → 制御」に切り替わる警告が出ていた。マウント前の仮の描画をやめ、タブは常に同じ構造で描き、チャートだけをマウント後に描くようにして解消
- 2026-10-06: ESLint 10 は eslint-plugin-react (eslint-config-next 経由) と互換がなく起動時に落ちたため、9 系に固定 (ADR 0007)
- 2026-10-06: lint で React Compiler のルール (set-state-in-effect、purity) に 7 件引っかかった。`useIsClient` (useSyncExternalStore) を作り、`useMediaQuery` も useSyncExternalStore に書き直した。パーティクルの乱数は部品の外の関数に出した
- 2026-10-06: チャットの会話領域に `role="log"`、エラーに `role="alert"` を付けた。Next.js のルートアナウンサーも `role="alert"` を持つため、テストでは文言で絞る
- 2026-10-06: コミットゲートのフックが、ヒアドキュメントの中の「git commit」という文字にも反応して作業中のコマンドを止めた。引用符とヒアドキュメントの中身を除いてから判定するように直し、判定部分を切り出してテストを付けた
- 2026-10-06: カバレッジ表はルートに紐づくテストだけを扱うため、道具のテスト用に `// @coverage-map ignore <理由>` を足した
- 2026-10-06: eval は API キーがない環境のため dry-run で仕組みだけ確かめた。最初の Success は持ち主が手元で作る (PBI の「やらないこと」)
- 2026-10-06: ブランチ保護は GitHub の管理画面での取り込みが要るため、ルールセットのファイルまでを用意した

## 検証

```
pnpm lint                         # 0 件
pnpm typecheck                    # OK
pnpm test:unit                    # 7 files / 54 tests passed
pnpm test:coverage-map -- --check # 穴なし
pnpm test:e2e                     # 83 passed (dev サーバー)
CI=1 pnpm test:e2e                # 83 passed (本番ビルド)
pnpm test:e2e --repeat-each=3 <追加・変更した spec>   # 183 passed
pnpm build                        # OK
pnpm eval:privacy --dry-run       # 51/51 (LLM を呼ばない仕組みの確認)
claude plugin validate .          # OK
pnpm commit-gate                  # 合格 (このコミット)
```
