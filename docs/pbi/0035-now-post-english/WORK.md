# WORK PBI-0035 /now の記事の英語版

## タスク

| # | タスク | 完了の確かめ方 | 状態 |
| --- | --- | --- | --- |
| 1 | 記事の英語版の型と、出し分けの関数 | test/lib/now/localize.test.ts・store.test.ts | 完了 |
| 2 | 自動訳の部品 (Kimi、訳したあとの検査) | test/lib/now/translate.test.ts | 完了 |
| 3 | 投稿のあとの自動訳と、失敗の Slack 通知 | test/app/api/now/route.test.ts | 完了 |
| 4 | 書き換えのときの英語版の扱い | test/app/api/now/[id]/route.test.ts | 完了 |
| 5 | 持ち主の訳の API (PUT・DELETE /en) | test/app/api/now/[id]/en/route.test.ts | 完了 |
| 6 | 訳し直しの API (POST /en/translate) | test/app/api/now/[id]/en/translate/route.test.ts | 完了 |
| 7 | 一覧のカードと文言 | e2e/now.spec.ts | 完了 |
| 8 | 記事のページ・metadata・JSON-LD | e2e/now-post-page.spec.ts・test/lib/now/structured-data.test.ts | 完了 |
| 9 | 英語版が出る E2E | e2e/now-english.spec.ts | 完了 |
| 10 | 観点の表・README の構成図 (/api/now → Kimi)・AGENTS.md の構成の説明 | `pnpm test:coverage-map -- --check` | 完了 |

## 記録

- 2026-10-24: design-flow の grilling で持ち主と仕様を合意 (docs/specs/now-post-english.md)。ADR 0037 を書いた。用語「英語版」を CONTEXT.md に足した
- 2026-10-24: 仕様を書く中で決めたこと (持ち主に報告済み): 書き換えで日本語が変わったらその場で英語版を外す / 記事の API で英語版を一緒に送る案は採らない (先に始まった自動訳は、英語版が変わっていれば保存しない) / 英語版の無いカードに "In Japanese" の印 / `en` だけ壊れていたら `en` を外して読む / 訳し直しの API はキーなしで 503、Slack には知らせない
- 2026-10-24: 作業ツリーの古いブランチ (docs/pbi-0027-done) ではなく、最新の develop から `feat/now-english` を切った (develop では /now が作り置き、ADR 0035)
- 2026-10-24: 実装は pbi-orchestration-jev で 9 件の PBI (docs/pbi/PBI-001〜009、手元だけ) に分けて進める
- 2026-10-24: レビューで、訳し直しの API が訳す前に読んだ記事を訳し終えてからそのまま保存し、訳の間の削除・書き換え・持ち主の訳を古い内容で上書きすることが分かった (ユーザーストーリー 23・24 に反する)。訳し終えたら読み直し、自動訳と同じ判定 (`staleReason`) で古ければ保存しない形に直した。消えていたら 404、変わっていたら 409。仕様と受け入れ条件 7 に足した
- 2026-10-24: `pnpm format:check` は手元の Windows (`core.autocrlf=true`) で、触っていないファイルの CRLF に反応して 191 件落ちる。中身の問題ではないので、変えたファイルだけを `prettier --check` で確かめた (CI は Linux なので影響しない)

- 2026-10-24: develop に先に PBI-0034 (`docs/pbi/0034-works-atelier-rename`、#85) がマージされていたので、この PBI を 0035 に付け替えた

## 検証結果

- 2026-10-24 (手元):
  - `pnpm lint` 通過、変えたファイルの `prettier --check` 通過、`pnpm typecheck` 通過、`pnpm test:unit` 51 ファイル 523 件通過、`pnpm build` 通過
  - `pnpm test:coverage-map -- --check` 通過 (`-- --write` で表を更新)
  - E2E: `e2e/now.spec.ts`・`e2e/now-post-page.spec.ts`・`e2e/now-english.spec.ts`・`e2e/i18n.spec.ts` を 56 件通過
  - 受け入れ条件 1〜11 は上のテストで確かめた。12 (Vercel のプレビューでの `after()` の自動訳と `maxDuration = 300`) は持ち主の確認待ち
