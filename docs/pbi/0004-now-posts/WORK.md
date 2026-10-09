# WORK-0004 /now をトークン付きの POST で投稿でき、カードとモーダルで読めるブログ風にする

PBI: [PBI.md](PBI.md)

## 計画

- [x] 保存先の抽象と Upstash (REST) / メモリの実装 — test/lib/now/store.test.ts
- [x] トークンの検証をデコレータにする — test/decorator/with-bearer-auth.test.ts
- [x] `POST /api/now`・`PUT /api/now/[id]`・`DELETE /api/now/[id]` — test/app/api/now/
- [x] 既存のユニットテストを test/ に移す — pnpm test:unit
- [x] /now のカード一覧と詳細ダイアログ (Markdown + Mermaid) — e2e/now.spec.ts
- [x] E2E の webServer にテスト用トークンとメモリの保存先を渡す — playwright.config.ts
- [x] 部品一覧・README・環境変数の例を更新する

## ADR が要る判断

- [0015](../../adr/0015-now-posts-storage-and-markdown.md): 保存先 (Upstash Redis) と Markdown・Mermaid のライブラリの採用
- [0016](../../adr/0016-test-directory-and-auth-decorator.md): ユニットテストの置き場所 (test/) と認証のデコレータ (decorator/)

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
- 2026-10-09: コミットゲートの E2E で `e2e/background-theme.spec.ts` (テーマ切り替え) がときどき落ちた。main の本番ビルドでも 36 回中 1 回落ちるので既存のフレーク (3D シーンの描画でクリックが待たされる)。この PBI では直さない。ゲートは本番ビルドを立てて `E2E_BASE_URL` を向けて実行し、合格した
- 2026-10-09: 依頼者の要望で、あとから直せるよう PUT を足した。題名と本文はまるごと置き換え、公開日は省くと元のまま (並び順を変えずに誤字を直せる)。`updatedAt` を持たせ、ダイアログに「（…更新）」と出す
- 2026-10-09: 依頼者の要望で、認証を `decorator/with-bearer-auth.ts` のデコレータにまとめた。JS の `@` デコレータはクラス専用なので、Route Handler を包む高階関数にした。`lib/now/auth.ts` は「どの環境変数のトークンか」の設定だけを持つ
- 2026-10-09: 依頼者の要望で、ユニットテストを `test/` に同じ階層で移した。`src/` を作るかは依頼者に確認し、作らないことにした。ルートのテストは `test/app/api/now/route.test.ts` (POST) と `test/app/api/now/[id]/route.test.ts` (PUT・DELETE) に分けた
- 見送り: 記事ごとの URL (`/now#id` で開く)、RSS への反映

## 検証

```
pnpm lint && pnpm typecheck && pnpm test:unit   # 97 passed
CI=1 pnpm test:e2e e2e/now.spec.ts --repeat-each 3   # 18 passed
pnpm build && NOW_POST_TOKEN=e2e-now-post-token NOW_POSTS_STORE=memory pnpm start --port 3100
E2E_BASE_URL=http://localhost:3100 pnpm commit-gate  # 105 passed、合格
```
