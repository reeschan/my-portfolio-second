# ADR (Architecture Decision Records)

あとから「なぜこうなっているのか」を辿れるように、設計上の決定を 1 件 1 ファイルで残す。

## いつ書くか

- テストの道具や観点を新しく採用する・やめる (例: 画像比較テストを入れる、a11y を必須にする)
- デザインのトークンを足す・意味を変える、コンポーネントの層や置き場所の決まりを変える
- CI の品質ゲートやコミットの検査を変える
- `testing/e2e-policy.yml` の `required` や `enabled` を変える
- 外部サービス・ライブラリ・デプロイ先など、戻すのにコストがかかる選択をする

テストを 1 本足すだけ、穴を埋めるだけなら ADR は不要 (PR の説明で足りる)。

## 書き方

- ファイル名は `NNNN-kebab-case-title.md`。番号は既存の最大 + 1
- [template.md](template.md) をコピーして使う
- 状態は `提案中` → `採用` / `却下`。採用後に覆すときは新しい ADR を書き、古い方の状態を `置き換え済み (NNNN)` にする
- 巡回エージェントが書く ADR は必ず `提案中` で出し、採用はリポジトリの持ち主が PR のマージで決める
- すでに採用済みの選択を後から記録するときは、状態を `採用 (後付け)` にし、本文に後付けであることを書く
- ADR は PBI (docs/pbi/) から参照される。進め方は [docs/agents/development-flow.md](../agents/development-flow.md)

## 一覧

| 番号 | タイトル | 状態 |
| --- | --- | --- |
| [0001](0001-testing-strategy.md) | テスト戦略: Playwright + Vitest、観点は方針ファイルで管理する | 採用 |
| [0002](0002-framework-and-hosting.md) | フレームワークとホスティング: Next.js (App Router) + Vercel | 採用 (後付け) |
| [0003](0003-ui-foundation.md) | UI の基盤: Tailwind CSS v4 + shadcn/ui (Radix) + lucide + Motion | 採用 (後付け) |
| [0004](0004-design-theme.md) | デザインテーマ: ダーク既定・青のアクセント・ガラス調、トークンは globals.css を正本にする | 採用 |
| [0005](0005-component-architecture.md) | コンポーネントの構成: ui / common / layout / features と data に分ける | 採用 |
| [0006](0006-visualization-and-3d.md) | 可視化と 3D 背景: React Three Fiber と Recharts | 採用 (後付け) |
| [0007](0007-ci-quality-gate.md) | CI の品質ゲート: lint・型・ユニット・ビルド・E2E が通らないとマージできない | 採用 |
| [0008](0008-chat-llm-and-privacy-eval.md) | チャットの LLM とプライバシー eval | 採用 |
| [0009](0009-commit-gate.md) | コミットゲート: E2E の追加と全テストの合格をコミットの条件にする | 採用 |
| [0010](0010-pbi-driven-development.md) | PBI 駆動の開発: PBI・WORK・ADR を先に書いてから実装する | 採用 |
| [0011](0011-self-marketplace.md) | 共有スキルを Self 組織のプラグインマーケットプレイスで配る | 採用 |
| [0012](0012-background-themes.md) | 3D 背景のテーマ: 選べるシーンをテーマごとのファイルに分け、色はシーンが持つ | 採用 |
| [0013](0013-typescript-strictness-and-complexity.md) | TypeScript の厳格化: 添字アクセスの検査・型情報つき lint・循環的複雑度の上限・外部入力のスキーマ | 採用 |
| [0014](0014-formatter-and-repo-automation.md) | 書式とリポジトリの自動化: Prettier・Dependabot・CodeQL・CI の共通化 | 採用 |
| [0015](0015-now-posts-storage-and-markdown.md) | /now の投稿: Upstash Redis に保存し、Markdown と Mermaid で描く | 提案中 |
| [0016](0016-test-directory-and-auth-decorator.md) | ユニットテストは test/ に同じ階層で置き、API の認証は decorator/ のデコレータで掛ける | 提案中 |
| [0017](0017-api-client-and-error-decorator.md) | API の呼び出しは apiFetch に集め、エラーはデコレータで上位がレスポンスにする | 提案中 |
| [0018](0018-slack-notify-decorator.md) | Slack への通知は Incoming Webhook で送り、Route Handler のデコレータで付ける | 提案中 |
| [0019](0019-chat-docs-external-store.md) | チャットの資料: リポジトリから外し、Vercel Blob (private) から読む | 提案中 |
| [0020](0020-readme-architecture-diagram-d2.md) | README の全体像の図は D2 で書き、ライト / ダーク用の自己完結 SVG をコミットする | 提案中 |
