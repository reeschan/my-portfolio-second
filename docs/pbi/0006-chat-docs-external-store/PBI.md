# PBI-0006 チャットの資料をリポジトリから外し、Vercel Blob (private) から読む

- 状態: 進行中
- 起票日: 2026-10-10
- 依頼者: リポジトリの持ち主
- 作業記録: [WORK.md](WORK.md)
- 関連 ADR: [0019](../../adr/0019-chat-docs-external-store.md)、[0002](../../adr/0002-framework-and-hosting.md)

## 背景・目的

AI チャットの資料 (`data/resume.md` の職務経歴書と `data/profile-freelance.md` の補足資料) は、リポジトリにコミットしてデプロイに含めている。
個人の経歴を細かく書いた文書なので、コミット履歴に残したくない。実行時に外部の保存先から読む形にして、リポジトリから外す。

## やること

- 資料を Vercel Blob の private ストアの `chat-docs/resume.md`・`chat-docs/profile-freelance.md` から読む (`lib/chat/documents.ts`)
  - `BLOB_READ_WRITE_TOKEN` が未設定なら、開発中だけ手元の `data/*.md` を読む。本番で読めなければチャットは 503
- `lib/chat/system-prompt.ts` を差し替え、`next.config.ts` の `outputFileTracingIncludes` を外す
- `data/*.md` を `.gitignore` に入れ、追跡をやめる
- 手元の `data/*.md` を Blob に上げるスクリプト (`pnpm chat-docs:upload`)
- ADR 0019 と、AGENTS.md・README・ADR 0002・`.env.example` の更新

## やらないこと

- 過去のコミット履歴からの削除 (git filter-repo と force push)。この PBI のマージ後に、持ち主の確認を取って別に行う
- システムプロンプトの文面の変更 (資料の中身も変えない)
- /now の保存先 (`lib/now/store.ts`) の作り替え
- Blob ストアの作成とプロジェクトへの接続 (持ち主が Vercel の管理画面で行う)

## 受け入れ条件

| # | 条件 | 確かめ方 |
| --- | --- | --- |
| 1 | トークンが設定されていれば Blob の `chat-docs/` の 2 つのファイルから資料を読む | test/lib/chat/documents.test.ts |
| 2 | トークンが未設定なら、開発中は `data/*.md` を読み、本番では 503 の HttpError を投げる | test/lib/chat/documents.test.ts |
| 3 | 資料が欠けているときは 503 の HttpError を投げ、壊れた結果をキャッシュしない | test/lib/chat/documents.test.ts |
| 4 | アップロードのスクリプトが 2 つの資料を private で上書き保存する | test/scripts/upload-chat-docs.test.ts |
| 5 | `data/*.md` が追跡されておらず、無くても `pnpm check` が通る | `git ls-files data/`、`pnpm check` |
