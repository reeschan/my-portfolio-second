# WORK-0006 チャットの資料をリポジトリから外し、Vercel Blob (private) から読む

PBI: [PBI.md](PBI.md)

## 計画

- [x] `lib/chat/documents.ts` (`loadChatDocuments`・`hasBlobCredentials`・`chatDocs`) — test/lib/chat/documents.test.ts
- [x] `lib/chat/system-prompt.ts` の差し替え、`next.config.ts` の `outputFileTracingIncludes` の削除、`.gitignore`、`playwright.config.ts` の env、`git rm --cached data/*.md`
- [x] `scripts/upload-chat-docs.mts` と `pnpm chat-docs:upload` — test/scripts/upload-chat-docs.test.ts
- [x] ADR 0019、AGENTS.md・README・ADR 0002・`.env.example` の更新
- [x] (持ち主) Blob ストアをプロジェクトにつなぎ、`pnpm chat-docs:upload` で資料を上げる
- [ ] (マージ後・持ち主の確認のうえ) 過去のコミット履歴から `data/resume.md`・`data/profile-freelance.md` を消す

## ADR が要る判断

- [ADR 0019](../../adr/0019-chat-docs-external-store.md): 資料の置き場所を外部の保存先に移すことと、Vercel Blob (private) の採用

## 記録

- 2026-10-10: 最初は /now と同じ Upstash Redis を考えたが、持ち主の判断で Vercel Blob の private ストアにした。資料をファイルのまま置け、管理画面で中身を確かめられる
- 2026-10-10: Blob は `get` を `useCache: false` で読み、アプリ側で 10 分キャッシュする。上書きしたとき CDN の古い版を読まないため
- 2026-10-10: 資料が片方でも欠けたら 503 にする。片方だけでプロンプトを作ると、根拠のない回答をしかねない。失敗はキャッシュしない
- 2026-10-10: トークンが無いときは開発中だけ手元の `data/*.md` を読む。プライバシー eval (`pnpm eval:privacy`) も手元で同じ経路を通る
- 2026-10-10: アップロードは両方の資料が空でないことを確かめてから上げる。片方だけ新しい状態を作らない
- 2026-10-10: Blob は公式 SDK (`@vercel/blob`) を使い、`apiFetch` を通さない。private の読み出しの認証を SDK が扱うため (ADR 0019)
- 2026-10-10: システムプロンプトの文面は変えていない (資料の読み込み元だけを変えた) ので、プライバシー eval の再実行はしていない
- 2026-10-10: 実際のストアは OIDC 方式で、BLOB_READ_WRITE_TOKEN が無く BLOB_STORE_ID だけがあった。BLOB_STORE_ID でも Blob を使うようにした (SDK に token を渡さず storeId を渡すと、OIDC トークンは SDK が取る)
- 2026-10-10: 手元からのアップロードには、ストアの接続先に Development を足し、Settings → Security の OIDC Federation で Development を有効にする必要があった
- 2026-10-10: 持ち主が pnpm chat-docs:upload で資料を上げ、chat-docs/ の 2 ファイルが手元とバイト数・文字数とも一致することと、loadChatDocuments で読めることを確かめた
- 2026-10-10: commit-gate の「必須観点の穴」が Windows で `spawnSync npx ENOENT` になった。`scripts/e2e-coverage.mjs` が npx をシェルなしで起動していたため。`pnpm exec playwright` に変えた (CI の Linux でも同じく動く)
- 2026-10-10: 同じスクリプトが app/ のルートを `/\/page\./` で探していて、Windows の `\` 区切りでは 1 件も見つからなかった。`[\\/]` で両方に合うようにした。表 (docs/testing/coverage-map.md) も作り直した (今回のテストの分と、以前から反映されていなかった /api/now の行)
- 2026-10-10: 手元の commit-gate で /now の E2E が並列実行時に回ごとに入れ替わって落ちた (単独なら通る。/now と mermaid はこのブランチで変えていない)。dev サーバーが初回アクセスでコンパイルするためで、Mermaid の SVG を待つ上限を 30 秒にし、手元 (dev サーバー) のときだけテストの上限を 60 秒にした。CI は本番ビルドなので 30 秒のまま。/now の a11y が 1 度だけ 17.6 秒で落ちた件は、修正後に再現せず原因は未確認
- 2026-10-10: develop に入った PBI-0007 の README のアーキテクチャ図 (D2) を取り込み、資料のノードを Vercel 内の resume.md から外部サービスの Vercel Blob (private) に描き直した。README の alt 文も合わせた
- 2026-10-10: CI のユニットテスト test/app/api/chat/route.test.ts が 503 で落ちた。本物の buildSystemPrompt が資料を読みに行き、CI には data/*.md が無いため (手元は写しがあるので通っていた)。テストで lib/chat/documents を決まった資料に差し替えた

## 検証

```
pnpm check
```
