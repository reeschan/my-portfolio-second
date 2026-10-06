<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# my-portfolio-second

Ryuki Tobita の個人ポートフォリオ。Next.js (App Router) + Tailwind CSS v4 で作っている。概要とアーキテクチャ図は [README.md](README.md)。

- ブラウザのタブ風 UI と three.js の 3D 背景
- 職務経歴について答える AI チャット (`/chat`、Moonshot / Kimi API)
- Vercel にデプロイ

上のブロックは `next dev` が自動で管理する。このファイルの編集はマーカーの外側だけで行う。

## 開発の進め方 (必読)

**ベースの実装は PBI ありきで進める。** 手順の正本は **[docs/agents/development-flow.md](docs/agents/development-flow.md)**。

1. PBI と WORK を `docs/pbi/<番号>-<slug>/` に起こす (`/self-base:start-pbi`)。受け入れ条件とそれを確かめるテストまで書く
2. 設計判断が要るなら ADR を `docs/adr/` に書いてから実装する
3. 実装とテスト。WORK に判断と経過を残す
4. コミットは `commit-gate` スキルを通してから (`pnpm commit-gate`)。フックが合格していない `git commit` を止める
5. PR は `/self-base:create-pr` で作る。CI の `ci-ok` が緑でないとマージできない

## コマンド

パッケージマネージャは pnpm。

| 目的 | コマンド |
| --- | --- |
| 開発サーバー | `pnpm dev` |
| lint | `pnpm lint` (ESLint 9。10 系は eslint-plugin-react と非互換なので上げない) |
| 型チェック | `pnpm typecheck` |
| ユニットテスト (Vitest) | `pnpm test:unit` |
| E2E テスト (Playwright) | `pnpm test:e2e` (手元では dev サーバー、CI では本番ビルドを起動する) |
| 観点ごとの E2E | `pnpm test:e2e --grep @chat` |
| ルート × 観点の表 | `pnpm test:coverage-map` (`-- --write` で docs/testing/coverage-map.md を更新、`-- --check` で必須観点の穴を検出) |
| CI と同じ確認 (E2E 以外) | `pnpm check` |
| コミット前の検査 | `pnpm commit-gate` (詳細は `.claude/skills/commit-gate/SKILL.md`) |
| チャットのプライバシー eval | `pnpm eval:privacy` (**本物の LLM を呼ぶ。人が手元で実行する**。エージェントは頼まれない限り実行しない) |

## 構成

- `app/`: ページ (`/overview` `/career` `/skills` `/works` `/now` `/chat`) と API (`/api/chat` `/rss.xml`)。ページは部品を組み立てるだけにする
- `components/`: UI。層と依存の向きは **[docs/design/components.md](docs/design/components.md)**
  - `ui/`: shadcn/ui の基本部品 (Button, Badge, Dialog, Tabs …)
  - `common/`: 画面をまたいで使う部品 (GlassPanel, Section, Callout, TagList, BulletList, TextLink)。`@/components/common` から import する
  - `layout/`: 全ページ共通の枠 (`page-template.tsx`、`browser-tabs.tsx` など)
  - `features/<機能>/`: ページ・機能ごとの部品 (career, skills, works, chat, background)
- `data/`: 表示データ (`career.ts` `skills.ts` `works.ts` `now.ts`)
  - `resume.md` と `profile-freelance.md` はチャットのサーバー側でのみ読む。`public/` には置かない
- `lib/`: `navigation.ts` (タブの並び)、`theme.ts` (three.js・recharts 用の色)、`format.ts`、`chat/` (システムプロンプト・伏せ字・レート制限)
- `hooks/`: `use-media-query.ts`、`use-is-client.ts`
- `evals/privacy/`: チャットのプライバシー eval。合格した結果は `success/` に残す
- `docs/`: `adr/` (設計判断)、`pbi/` (PBI と WORK)、`design/` (テーマと部品)、`agents/` (エージェントの手順)、`testing/`
- `plugins/self-base/` + `.claude-plugin/marketplace.json`: Self 組織の共通スキル (`start-pbi`、`create-pr`)
- `.claude/`: リポジトリ固有のスキル (`e2e-patrol`、`commit-gate`) とフック

## デザインの決まり

- 色・質感はトークンだけを使う。正本は `app/globals.css`、一覧は **[docs/design/theme.md](docs/design/theme.md)**
  - 生の色 (`bg-blue-500`、`#3399ff`) を書かない。足りなければトークンを足し、ADR 0004 を更新する
  - ガラス調の面は `GlassPanel` (`glass-panel`)、帯は `glass-bar`
- 押せるものは `button` / `a` にする。`div` に `onClick` を付けない
- 名前のない領域には `aria-label` を付け、E2E が `getByRole` で取れるようにする
- ブラウザでしか描けないものは `useIsClient()` で出し分ける。`useEffect` の中で `setState` しない

## テストの方針

テスト観点の正本は **[testing/e2e-policy.yml](testing/e2e-policy.yml)**。テストを書く・直す前に必ず読むこと。

- 決定の経緯は [docs/adr/](docs/adr/) にある
- 現状の網羅状況は [docs/testing/coverage-map.md](docs/testing/coverage-map.md) にある

守ること:

- **画面や機能を変えたら E2E を足す**。コミットゲートが、テストを伴わない変更のコミットを止める
- E2E は `e2e/fixtures.ts` の `test` / `expect` を使う。`@playwright/test` から直接 import しない
  - console エラーと未捕捉例外は自動で検出される
  - 意図して起こすエラーは `test.use({ allowedConsoleErrors: [...] })` で宣言する
- 各テストに観点タグと対象ルートを付ける。付けないとカバレッジ表に載らない
  - 観点タグは方針ファイルのキー名を使う (`tag: ["@smoke"]` など)
  - 対象ルートは `annotation: routes("/chat")` のように書く
- Vitest のファイルは先頭に `// @perspectives <観点...>` と `// @routes <ルート...>` を書く
  - ルートに紐づかない道具のテストは `// @coverage-map ignore <理由>` を書く
- 要素はロールとアクセシブルネームで取る (`getByRole`)。CSS クラスや DOM 構造に依存しない
- 表示内容のテスト (content 観点) は、期待値を `data/` から import して突き合わせる。文言を二重に書かない
- **外部 LLM を絶対に呼ばない**
  - E2E は `page.route("**/api/chat", ...)` でモックする
  - ユニットは `fetch` をモックする
  - 本物の LLM を呼ぶのは `evals/privacy/` だけ。CI からは呼ばない
- 固定の `waitForTimeout` を使わない。Web-first アサーション (`await expect(...).toBeVisible()`) で待つ
- ページを足したら `lib/navigation.ts` と `e2e/fixtures.ts` の `pages` の両方に足す
- チャットのシステムプロンプトを変えたら、`pnpm eval:privacy` で Success を出してもらい、その記録を同じ PR に入れる

## 定期巡回

テストの穴を定期的に埋める手順は **[docs/agents/e2e-patrol.md](docs/agents/e2e-patrol.md)** にある。「E2E を巡回して」「テストの穴を埋めて」と頼まれたら、この手順に従う。

## 変更のしかた

- ブランチを切って PR を出す。`main` に直接 push しない (ルールセットで禁止している)
- UI の文言は日本語で書く
- コードのコメントも日本語で、理由 (なぜそうするか) を書く
