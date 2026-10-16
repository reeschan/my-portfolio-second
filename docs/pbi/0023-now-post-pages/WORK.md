# WORK-0023 /now の記事ごとのページを作り、記事の内容を検索エンジンに載せる

PBI: [PBI.md](PBI.md)

## 計画

- [x] `pageMetadata()` に記事用の OGP を足し、`BlogPosting` の JSON-LD を作る関数を足す — test/lib/metadata.test.ts、test/lib/now/structured-data.test.ts
- [x] `nowPostPath()` を足し、RSS のリンクを `/now/<id>` にする — test/lib/now/feed.test.ts
- [x] Markdown の見出しの始まりを選べるようにし、タブを `/now/<id>` でも選んだ状態にする — 型チェック、E2E
- [x] `/now/[id]` のページを作る — e2e/now-post-page.spec.ts
- [x] sitemap に記事を載せる — test/app/sitemap.test.ts、e2e/seo.spec.ts
- [x] 一覧のカードをリンクにし、ダイアログをやめ、`?post=` をリダイレクトする — e2e/now.spec.ts

## ADR が要る判断

- [ADR 0030](../../adr/0030-now-post-pages.md): 記事の URL の形、一覧からの開き方 (ダイアログをやめる)、404 と 5xx の分け方、sitemap と RSS の扱い

## 記録

- 2026-10-16: 起票。持ち主から「記事を投稿したとき、記事の内容も SEO に載せたい」と依頼。調べると記事ごとの URL がなく、本文はダイアログの中にしかなかった
- 2026-10-16: 一覧のダイアログは残さず、記事のページへのリンクにした。intercepting routes は描き方が 2 つになり、表示言語の Cookie との組み合わせを確かめる手間が大きい (ADR 0030)
- 2026-10-16: 実装は pbi-orchestration-jev で 6 件に分けて進める
- 2026-10-16: 6 件とも完了。差し戻しは 1 回 (Markdown とタブの変更で書式の検査が落ちた) だけ。全体で lint・型・ユニット 237 件・ビルド・E2E (now・記事ページ・seo の 31 件) が通った
- 2026-10-16: sitemap はリクエストごとに保存先から読む。保存先が落ちても固定のページだけは返す (RSS と同じ作り)

## 検証

```
pnpm commit-gate
```
