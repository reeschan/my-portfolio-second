# WORK-0004 /now をトークン付きの POST で投稿でき、カードとモーダルで読めるブログ風にする

PBI: [PBI.md](PBI.md)

## 計画

- [x] 保存先の抽象と Upstash (REST) / メモリの実装 — lib/now/store.test.ts
- [x] トークンの検証 — lib/now/auth.test.ts
- [x] `POST /api/now` と `DELETE /api/now/[id]` — app/api/now/route.test.ts
- [x] /now のカード一覧と詳細ダイアログ (Markdown + Mermaid) — e2e/now.spec.ts
- [x] E2E の webServer にテスト用トークンとメモリの保存先を渡す — playwright.config.ts
- [x] 部品一覧・README・環境変数の例を更新する

## ADR が要る判断

- [0015](../../adr/0015-now-posts-storage-and-markdown.md): 保存先 (Upstash Redis) と Markdown・Mermaid のライブラリの採用

## 記録

- 2026-10-09: 保存先は Upstash Redis にした。SDK は使わず REST を fetch で呼ぶので依存が増えない。Vercel KV の環境変数名も読む
- 2026-10-09: 本番で Redis が未設定のときにメモリへ黙って保存すると、インスタンスが替わったときに記事が消えて気づけない。本番は `NOW_POSTS_STORE=memory` を明示したとき (E2E) だけメモリを使い、それ以外は 503 にした
- 2026-10-09: /now は `connection()` でリクエストごとに描く。`revalidatePath` は使わない (静的に固めないので不要)
- 2026-10-09: mermaid の SVG は ref に直接差し込む (useEffect の中で setState しない約束のため)。React が中身を持たない div にだけ書き、元のコードの `<pre>` は data-state で隠す。構文エラーのときはコードのまま見せる
- 2026-10-09: 記事の見出しはダイアログの題 (h2) の下に入るので、Markdown の `#` を h3 から始めるようにずらした
- 2026-10-09: ダイアログは背景の暗幕を `bg-black/40`、面を `bg-card/70` + `backdrop-blur-lg` にして 3D 背景が透けるようにした。暗幕の濃さを変えるため `DialogContent` に `overlayClassName` を足した
- 2026-10-09: `data/now.ts` の `lastUpdated` と `sections` は記事に置き換わるので消した。更新日は最新の記事の公開日から出す。拠点と受付状況は残した
- 2026-10-09: E2E は並列で同じサーバーに投稿するので、題名を毎回一意にし、件数や先頭の記事には頼らない書き方にした
- 2026-10-09: スクリーンショットで、カードの抜粋に `[x]` と表の `---` が残るのに気づき直した。チェックリストが混ざった箇条書きで黒丸が消えていたのも直した
- 見送り: 記事ごとの URL (`/now#id` で開く)、RSS への反映、編集 API

## 検証

```
pnpm lint && pnpm typecheck && pnpm test:unit   # 97 passed
pnpm build && CI=1 pnpm test:e2e                # 105 passed
CI=1 pnpm test:e2e e2e/now.spec.ts --repeat-each 3   # 18 passed
```
