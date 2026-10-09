# 0015. /now の投稿: Upstash Redis に保存し、Markdown と Mermaid で描く

- 状態: 提案中
- 日付: 2026-10-09
- 関連: [PBI-0004](../pbi/0004-now-posts/PBI.md)、[ADR 0002](0002-framework-and-hosting.md)、[ADR 0005](0005-component-architecture.md)

## 背景

/now は `data/now.ts` を書き換えてデプロイする作りで、近況を足すたびにコミットが要る。
決まったトークン付きの POST で記事を足し、ブログのようにカードで並べたい。
Vercel のサーバーレス関数はファイルに書いても残らないので、外部の保存先が要る。
本文は Markdown で書き、構成図は Mermaid で描きたい。画像の埋め込みは扱わない。

## 決定

- **保存先は Upstash Redis** (Vercel Marketplace から追加する)。記事は 1 つのハッシュ `now:posts` に `id → JSON` で入れる
  - SDK は入れず、REST API (`HGETALL` / `HSET` / `HDEL`) を `fetch` で直接呼ぶ (`lib/now/store.ts`)
  - 環境変数は `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`、または Vercel KV の名前 `KV_REST_API_URL` / `KV_REST_API_TOKEN`
  - Redis が未設定なら、開発中と `NOW_POSTS_STORE=memory` (E2E) のときだけプロセス内のメモリに保存する。本番で未設定なら投稿は 503 にし、一覧は空にする
- **認可は固定のトークン**。`Authorization: Bearer <NOW_POST_TOKEN>` と定数時間で比べる。未設定なら誰も投稿できない
- **API**: `POST /api/now` (足す)、`DELETE /api/now/[id]` (消す)。編集は「消して足し直す」で済ませる
- **描画**: `react-markdown` + `remark-gfm`。生の HTML は描かない。` ```mermaid ` のコードブロックだけ `mermaid` で SVG にする
  - mermaid は大きいので、図を開いたときに動的 import する。`securityLevel: "strict"`
- /now はリクエストごとに保存先から読む (`connection()`)。書き込み後のキャッシュ破棄は要らない

## 検討した選択肢

| 選択肢 | 良い点 | 悪い点 |
| --- | --- | --- |
| **Upstash Redis (REST)** | Vercel から数クリックで追加でき、無料枠で足りる。REST なので依存を足さずに済む | 一覧を作るのに全件を読む (数百件までなら問題ない) |
| Vercel Blob に JSON を置く | 設定が簡単 | 1 ファイルの読み書きが競合しやすく、一覧のために毎回取りに行く |
| Postgres (Neon など) | 件数が増えても困らない、検索もできる | 個人の近況には重い。スキーマとマイグレーションの管理が増える |
| GitHub に Markdown をコミットする API | 履歴が残る、保存先が要らない | 投稿のたびにビルドとデプロイが走り、反映まで分単位かかる |
| Markdown: `marked` + `dangerouslySetInnerHTML` | 軽い | サニタイズを自前で持つことになる |
| Mermaid をサーバーで SVG にする | ブラウザに mermaid を送らずに済む | ヘッドレスブラウザが要り、サーバーレスでは重い |

## 結果

- 記事はトークンを持つ本人だけが、デプロイなしで足せる。保存先が落ちてもページは出る (一覧が空になる)
- 依存に `react-markdown` / `remark-gfm` / `mermaid` が増える。mermaid は記事のダイアログを開いたときだけ読み込む
- E2E は webServer にテスト専用のトークンとメモリの保存先を渡し、本物の Redis に書かない (`playwright.config.ts`)
- 新しい API ルート `/api/now` は `api-contract` 観点の対象。`app/api/now/route.test.ts` で検証する
- 画像の埋め込み・下書き・編集画面は扱わない。必要になったら別の PBI で考える
