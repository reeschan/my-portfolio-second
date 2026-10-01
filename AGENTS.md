<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# my-portfolio-second

Ryuki Tobita の個人ポートフォリオ。Next.js (App Router) + Tailwind CSS v4 で作っている。

- ブラウザのタブ風 UI と three.js の 3D 背景
- 職務経歴について答える AI チャット (`/chat`、Moonshot / Kimi API)
- Vercel にデプロイ

上のブロックは `next dev` が自動で管理する。このファイルの編集はマーカーの外側だけで行う。

## コマンド

パッケージマネージャは pnpm。

| 目的 | コマンド |
| --- | --- |
| 開発サーバー | `pnpm dev` |
| 型チェック | `pnpm typecheck` |
| ユニットテスト (Vitest) | `pnpm test:unit` |
| E2E テスト (Playwright) | `pnpm test:e2e` (手元では dev サーバー、CI では本番ビルドを起動する) |
| 観点ごとの E2E | `pnpm test:e2e --grep @chat` |
| ルート × 観点の表 | `pnpm test:coverage-map` (`-- --write` で docs/testing/coverage-map.md を更新、`-- --check` で必須観点の穴を検出) |

## 構成

- `app/`: ページ (`/overview` `/career` `/skills` `/works` `/now` `/chat`) と API (`/api/chat` `/rss.xml`)
- `components/`: UI
  - `page-template.tsx` は全ページ共通の枠
  - `browser-tabs.tsx` はタブとアドレスバー
- `data/`: 表示データ
  - `now.ts` は /now の内容
  - `resume.md` と `profile-freelance.md` はチャットのサーバー側でのみ読む。`public/` には置かない
- `lib/chat/`: チャット API の補助 (システムプロンプト・連絡先の伏せ字・レート制限)

## テストの方針

テスト観点の正本は **[testing/e2e-policy.yml](testing/e2e-policy.yml)**。テストを書く・直す前に必ず読むこと。

- 決定の経緯は [docs/adr/](docs/adr/) にある
- 現状の網羅状況は [docs/testing/coverage-map.md](docs/testing/coverage-map.md) にある

守ること:

- E2E は `e2e/fixtures.ts` の `test` / `expect` を使う。`@playwright/test` から直接 import しない
  - console エラーと未捕捉例外は自動で検出される
  - 意図して起こすエラーは `test.use({ allowedConsoleErrors: [...] })` で宣言する
- 各テストに観点タグと対象ルートを付ける。付けないとカバレッジ表に載らない
  - 観点タグは方針ファイルのキー名を使う (`tag: ["@smoke"]` など)
  - 対象ルートは `annotation: routes("/chat")` のように書く
- Vitest のファイルは先頭に `// @perspectives <観点...>` と `// @routes <ルート...>` を書く
- 要素はロールとアクセシブルネームで取る (`getByRole`)。CSS クラスや DOM 構造に依存しない
- **外部 LLM を絶対に呼ばない**
  - E2E は `page.route("**/api/chat", ...)` でモックする
  - ユニットは `fetch` をモックする
- 固定の `waitForTimeout` を使わない。Web-first アサーション (`await expect(...).toBeVisible()`) で待つ
- ページを足したら `e2e/fixtures.ts` の `pages` にも足す

## 定期巡回

テストの穴を定期的に埋める手順は **[docs/agents/e2e-patrol.md](docs/agents/e2e-patrol.md)** にある。「E2E を巡回して」「テストの穴を埋めて」と頼まれたら、この手順に従う。

## 変更のしかた

- ブランチを切って PR を出す。`main` に直接 push しない
- UI の文言は日本語で書く
- コードのコメントも日本語で、理由 (なぜそうするか) を書く
