# WORK-0028 SEO の 2 段目: 構造化データ・404・説明文を整え、SEO の検査をテストに写す

PBI: [PBI.md](PBI.md)

## 計画

- [x] seo 観点を新しく作り、全ページの基本の検査を入れる — e2e/seo-pages.spec.ts、`pnpm test:coverage-map -- --check`
- [x] 固定のページの description を書き直す — test/data/messages-seo.test.ts
- [x] 監査の手順書を書く — docs/agents/seo-audit.md
- [x] /theme を道具のページにし、sitemap から外して noindex にする — test/app/sitemap.test.ts、e2e/seo-noindex.spec.ts、e2e/seo.spec.ts
- [x] og:image を版の分かる URL にし、og:locale を足す — test/lib/metadata.test.ts
- [x] セキュリティヘッダー — e2e/security-headers.spec.ts
- [x] /career・/works の見出しの段を直す — e2e/seo-headings.spec.ts
- [x] Person・WebSite の構造化データを全ページに出す — test/lib/structured-data.test.ts、e2e/seo-structured-data.spec.ts
- [x] /overview に ProfilePage を出す — 同上
- [x] 自前の 404 — e2e/not-found.spec.ts
- [ ] (PBI-0024 のマージ後) 記事の見出し・抜粋・BlogPosting・BreadcrumbList

## ADR が要る判断

- [ADR 0033](../../adr/0033-seo-test-perspective.md): テスト観点 seo を新しく作り、app の全ページで必須にする

## 記録

- 2026-10-21: 起票。持ち主から「SEO 対策の 2 段目として jev-seo を取り入れたい」と依頼。design-flow で詰め (Q1〜Q29)、仕様 docs/specs/seo-stage2.md にまとめた。jev-seo はサイトに組み込むコードを持たない監査の CLI なので、考え方だけ借りてコードとテストを直し、本番に出たあとに持ち主が手元で 1 回当てる
- 2026-10-21: 正のホストは PBI-0027 の決定 (apex) に合わせた。最初は www で合意したが、同じ日に 0027 で apex が選ばれていたので取り消した
- 2026-10-21: 構造化データは、ルートのレイアウトが WebSite と Person を 1 つの script で出し、ページごとの部分 (ProfilePage・BlogPosting・BreadcrumbList) はページが別の script で出して `@id` で指す。App Router ではレイアウトにページの中身を渡せないので、仕様の「1 つの script」は「Person が 1 ページに 1 つ」を守る形に読み替えた
- 2026-10-21: og:locale は ja_JP に固定した。クローラは表示言語の Cookie を送らないので、言語に合わせても検索には効かない。og:image の版は、画像の描き方を変えたら上げる定数をクエリに付ける
- 2026-10-21: 実装は pbi-orchestration-jev で 10 件に分けて進める。記事にかかわる部分は PBI-0024 のマージ後に回す
- 2026-10-21: 実装 (PBI-001〜010) をすべて終えた。/career・/works の見出しを h3 から h2 にしたので、それを見ていた e2e/content.spec.ts・e2e/i18n.spec.ts の段も 2 に合わせた。dev サーバーはファイルで置いた OG 画像をテストサーバーのホストで出すので、自サイトの URL を見る E2E は、CI でないときだけ /opengraph-image に限ってテストサーバーのホストを認める
- 2026-10-22: 全体の確認。lint・型・ユニット (259)・ビルドと E2E 全体 (219) が通り、`pnpm test:coverage-map -- --check` も通った。記事の見出し・抜粋・BlogPosting・BreadcrumbList は PBI-0024 のマージ後に回す (計画の最後の項目は未着手)

## 検証

```
pnpm commit-gate
```
