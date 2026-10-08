# Ryuki Tobita's Portfolio

フロントエンドからクラウド基盤まで手がけるエンジニア、Ryuki Tobita の個人ポートフォリオサイト。
ブラウザのタブを模した画面で経歴・スキル・作品を見せ、職務経歴について AI に質問できるチャットを備えている。

## ページ

| パス | 内容 |
| --- | --- |
| `/` | トップ (Enter から各ページへ) |
| `/overview` | 概要・プロフィール |
| `/career` | 経歴のタイムライン。フリーランス期は参画案件の詳細をダイアログで見られる |
| `/skills` | スキルのレーダーチャート (概要 / フロントエンド / バックエンド / AWS) と資格 |
| `/works` | 制作物。カードから詳細とアーキテクチャを開ける |
| `/now` | いま取り組んでいること ([nownownow.com](https://nownownow.com/about) の考え方) |
| `/chat` | 職務経歴について答える AI チャット (Moonshot / Kimi) |
| `/theme` | 背景の 3D シーンを選ぶ (グリッド / オーロラ / 月夜の海 / 蛍の森 / 月面 / 皆既日食) |
| `/rss.xml` | RSS フィード |

全ページの背後に three.js の 3D 背景 (`/theme` で選べる) があり、その上にガラス調のパネルを重ねるデザイン (ダークテーマ既定)。

## アーキテクチャ

```mermaid
flowchart LR
  subgraph Browser["ブラウザ"]
    UI["ページ (app/**/page.tsx)<br/>PageTemplate + 部品"]
    BG["3D 背景<br/>React Three Fiber"]
    Chart["スキルのチャート<br/>Recharts"]
    ChatUI["チャット画面<br/>ResumeChat"]
  end

  subgraph Vercel["Vercel (Next.js App Router)"]
    RSC["サーバーコンポーネント<br/>data/*.ts を描画"]
    ChatAPI["/api/chat<br/>入力検証・レート制限"]
    Prompt["システムプロンプト<br/>lib/chat/system-prompt.ts"]
    Docs[("data/resume.md<br/>data/profile-freelance.md<br/>(サーバーのみ)")]
    Redact["伏せ字<br/>lib/chat/redact.ts"]
    RSS["/rss.xml"]
  end

  LLM["Moonshot API<br/>(Kimi)"]

  UI --> RSC
  UI --- BG
  UI --- Chart
  ChatUI -- "POST 会話履歴" --> ChatAPI
  ChatAPI --> Prompt
  Prompt --> Docs
  ChatAPI -- "ストリーム" --> LLM
  LLM -- "回答 (思考過程は捨てる)" --> Redact
  Redact -- "テキストのストリーム" --> ChatUI
```

### 画面の部品の層

```mermaid
flowchart TD
  page["app/**/page.tsx"] --> layout["components/layout<br/>PageTemplate・BrowserTabs"]
  page --> features["components/features<br/>career・skills・works・chat・background"]
  features --> common["components/common<br/>GlassPanel・Section・Callout・TagList…"]
  layout --> common
  common --> ui["components/ui<br/>shadcn/ui (Radix)"]
  features --> data["data/*.ts"]
  theme["app/globals.css<br/>デザイントークン"] -.-> ui
  theme -.-> common
```

### 技術

| 領域 | 採用しているもの | 理由 |
| --- | --- | --- |
| フレームワーク | Next.js (App Router)、TypeScript、pnpm | [ADR 0002](docs/adr/0002-framework-and-hosting.md) |
| ホスティング | Vercel | 同上 |
| UI | Tailwind CSS v4、shadcn/ui (Radix)、lucide、Motion | [ADR 0003](docs/adr/0003-ui-foundation.md) |
| デザイン | ダーク既定・青のアクセント・ガラス調のトークン | [ADR 0004](docs/adr/0004-design-theme.md)、[docs/design/theme.md](docs/design/theme.md) |
| 部品の構成 | ui / common / layout / features + data | [ADR 0005](docs/adr/0005-component-architecture.md)、[docs/design/components.md](docs/design/components.md) |
| 可視化・3D | React Three Fiber、Recharts | [ADR 0006](docs/adr/0006-visualization-and-3d.md) |
| AI チャット | Moonshot / Kimi、自前のプロンプト + 伏せ字 + プライバシー eval | [ADR 0008](docs/adr/0008-chat-llm-and-privacy-eval.md) |
| テスト | Playwright (E2E)、Vitest、axe | [ADR 0001](docs/adr/0001-testing-strategy.md) |
| 品質ゲート | ESLint、GitHub Actions (`ci-ok`)、コミットゲート | [ADR 0007](docs/adr/0007-ci-quality-gate.md)、[ADR 0009](docs/adr/0009-commit-gate.md) |

## 開発

```bash
pnpm install
cp .env.example .env.local   # チャットを動かすなら MOONSHOT_API_KEY を書く (なくても他のページは動く)
pnpm dev                     # http://localhost:3000
```

| 目的 | コマンド |
| --- | --- |
| lint / 型チェック | `pnpm lint` / `pnpm typecheck` |
| ユニットテスト (Vitest) | `pnpm test:unit` |
| E2E テスト (Playwright、デスクトップ + スマホ幅) | `pnpm test:e2e` |
| ルート × 観点のカバレッジ表 | `pnpm test:coverage-map` |
| CI と同じ確認 (E2E 以外) | `pnpm check` |
| コミット前の検査 | `pnpm commit-gate` |
| チャットのプライバシー eval (本物の LLM を呼ぶ) | `pnpm eval:privacy` |

- テストの観点は [testing/e2e-policy.yml](testing/e2e-policy.yml)、網羅状況は [docs/testing/coverage-map.md](docs/testing/coverage-map.md)
- E2E・ユニットは LLM を必ずモックする。本物の LLM を呼ぶのは eval だけ ([evals/privacy/](evals/privacy/README.md))

## 開発の進め方

- 実装は **PBI ありき**: PBI (何を・なぜ・完了条件) → WORK (計画と記録) → 必要なら ADR → 実装とテスト → コミットゲート → PR。手順は [docs/agents/development-flow.md](docs/agents/development-flow.md)
- `main` には PR からのみマージする。CI の `ci-ok` (lint・型・ユニット・ビルド・E2E) が緑であることが条件 ([.github/rulesets/main.json](.github/rulesets/main.json))
- AI エージェント向けの指示は [AGENTS.md](AGENTS.md)。Self 組織の共通スキル (PBI の起票・PR の作成) は [plugins/self-base/](plugins/self-base/README.md)
