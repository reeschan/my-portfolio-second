# WORK-0018 お問い合わせフォームを足し、お問い合わせを Slack に届ける

PBI: [PBI.md](PBI.md)

## 計画

- [x] IP ごとのレート制限を共通の場所に移し、枠ごとに上限を持てるようにする — test/lib/rate-limit.test.ts とチャットの route のテストが通る
- [x] `POST /api/contact` と Slack への通知の中身 (テストを先に書く) — test/app/api/contact/route.test.ts が通る
- [x] `/contact` のページ・フォーム・タブ・辞書 (E2E を先に書く) — e2e/contact.spec.ts とタブ・smoke・a11y の E2E が通る
- [x] 部品の一覧・AGENTS.md・README を更新する — 記述が実装と合っている

## ADR が要る判断

- 届け先を Slack だけにし、応答の前に送って結果を確かめる。外部モック観点の対象を足す: [ADR 0028](../../adr/0028-contact-form-slack-only.md)

## 記録

- 2026-10-13: 起票。design-flow で持ち主と合意した仕様は [docs/specs/contact-form.md](../../specs/contact-form.md)。通知はポートフォリオ全体で統一するので `SLACK_WEBHOOK_URL` を使う。メールは送らず、持ち主のメールアドレスはどこにも書かない
- 2026-10-13: PBI-001 の指定に合わせ、枠の名前ではなく `createRateLimiter` ごとの Map で状態を分けた。期限切れの除外・1000 件超の掃除と、チャットの 10 分 20 回の制限を維持した。
- 2026-10-13: テストを先に書き、共通の関数が無いことで失敗するのを確かめてから実装した。レート制限の 5 件とチャットの route の 13 件が通り、lint・型も通る
- 2026-10-13: 手元の pnpm 12 の `minimumReleaseAge` (公開から 1 日たっていないパッケージを拒む) が、PR #34 で入った自作の `tokiline@0.1.0` を弾き、install も run も止まった。持ち主と決めて tokiline だけを除外した。除外は手元の `pnpm-workspace.yaml` に書く (このリポジトリでは、pnpm 12 が書き込むこのファイルを `.git/info/exclude` で手元だけのものにしている。CI の pnpm 10 には影響しない)
- 2026-10-13: CI の書式検査 (`pnpm format:check`) の対象は ts / tsx / mts / mjs / css だけ。手元では `core.autocrlf=true` で、develop のままでも `pnpm format:check` が落ちるので、変えたファイルのうち CI と同じ拡張子のものだけを Prettier で確かめる。生成物の `docs/testing/coverage-map.md` は Prettier の形ではないが、CI の対象外なので `.prettierignore` には足さない
- 2026-10-13: `POST /api/contact` はテストを先に書き、route が無いことで失敗するのを確かめてから実装した。メールアドレスは zod 4 の `.email()` が非推奨のため、trim と長さの確認のあとに `.pipe(z.email())` で形式を確かめる
- 2026-10-13: Slack の本文は 1 字ずつ無害化してから、引用の `>` を含めて 2900 字を超えない section に分ける。実体参照 (`&amp;` など) の途中では切らない。本文は切り詰めずに全文を載せる
- 2026-10-13: E2E を先に書き、`/contact` が 404 で落ちるのを確かめてから実装した。画面のエラーは API の文言 (日本語だけ) を出さず、応答のステータス (400・429・503・それ以外) から辞書の文言を選ぶ。項目のエラーも辞書のキーで持ち、言語を切り替えても追従させる
- 2026-10-13: 既定の `Button` (primary) は暗い背景で白い文字とのコントラストが 2.94 しかなく、axe の color-contrast で落ちたので、送信ボタンは outline にした。`text-destructive` の赤も文字では 4.5:1 に届かないため、エラーの文字は foreground にし、赤はアイコンで示す
- 2026-10-13: タブを足すと概要の案内の並び (test/data/overview.test.ts) も合わせる必要があるので、`data/overview.ts`・`data/en/overview.ts` に `/contact` の案内を足した
- 2026-10-13: PBI-004 の部品の一覧・AGENTS.md・README を実装と照合して更新した。検証 2〜4 は通り、Next.js のマーカー内も develop と一致した。検証 1 は pnpm が見つからず終了コード 127。同じ対象をインストール済みの Prettier で直接検査すると通った (終了コード 0)。

## 検証

```
pnpm commit-gate
```
