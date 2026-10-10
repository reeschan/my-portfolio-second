# 0019. チャットの資料: リポジトリから外し、Vercel Blob (private) から読む

- 状態: 提案中
- 日付: 2026-10-10
- 関連: [PBI-0006](../pbi/0006-chat-docs-external-store/PBI.md)、[ADR 0002](0002-framework-and-hosting.md)、[ADR 0008](0008-chat-llm-and-privacy-eval.md)、[ADR 0015](0015-now-posts-storage-and-markdown.md)

## 背景

チャットの資料は個人の経歴を細かく書いた文書で、コミット履歴に残したくない。
これまでは `data/` にコミットし、`next.config.ts` の `outputFileTracingIncludes` でデプロイに含めていた。

## 決定

- **保存先は Vercel Blob の private ストア** (`my-portfolio-second-blob`)。`chat-docs/resume.md` と `chat-docs/profile-freelance.md` として置く
  - 資格情報は OIDC 方式。ストアをプロジェクトにつなぐと Vercel が `BLOB_STORE_ID` を入れ、OIDC トークンは実行時に SDK が取る
  - トークン方式 (`BLOB_READ_WRITE_TOKEN`) でも動く。両方あればトークン方式を使う
  - 手元から読み書きするには、ストアの接続先の環境に Development を含め、プロジェクトの Settings → Security の OIDC Federation でも Development を有効にする。そのうえで `vercel env pull` する
- **読み方**: 公式 SDK `@vercel/blob` の `get` を `useCache: false` で使い、アプリ側で 10 分キャッシュする。上書きすれば再デプロイなしで 10 分以内に反映される
- **資格情報が無いとき**: 開発中だけ手元の `data/*.md` を読む。本番で読めなければチャットは 503
- **手元の写し**: `data/*.md` は `.gitignore` で除外し、`pnpm chat-docs:upload` で Blob に上げる
- **履歴の削除**: 過去のコミット履歴からの削除は、この変更のマージ後に `git filter-repo` で別に行う
- **apiFetch の例外**: AGENTS.md の「API は apiFetch を通す」の例外として、Blob は公式 SDK を使う。認証付きの private 読み出しを SDK が扱うため

## 検討した選択肢

| 選択肢 | 良い点 | 悪い点 |
| --- | --- | --- |
| **Vercel Blob (private)** (採用) | ファイルとして置け、Vercel の管理画面で中身を見て差し替えられる | 依存 `@vercel/blob` とトークンが増える |
| Upstash Redis (/now と同じ保存先) | 依存が増えない | 文書をキーの値として持つことになり、差し替えも専用の操作が要る |
| 環境変数に入れる | 単純 | Vercel の環境変数は合計 64KB までで、資料が約 32KB あり余裕がない |
| 別の private リポジトリを submodule にする | 履歴が残る | ビルドに別リポジトリの認証が要る |

## 結果

- リポジトリに資料が無くてもビルドとテストが通る
- チャットは Blob が読めないと 503 になる
- E2E は `/api/chat` をモックしており、`BLOB_READ_WRITE_TOKEN` も空にしている
- プライバシー eval (`pnpm eval:privacy`) は手元の `data/*.md` か Blob から読む
