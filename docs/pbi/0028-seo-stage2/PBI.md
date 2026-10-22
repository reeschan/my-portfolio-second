# PBI-0028 SEO の 2 段目: 構造化データ・404・説明文を整え、SEO の検査をテストに写す

- 状態: 進行中
- 起票日: 2026-10-21
- 依頼者: リポジトリの持ち主
- 作業記録: [WORK.md](WORK.md)
- 仕様: [docs/specs/seo-stage2.md](../../specs/seo-stage2.md)
- 関連 ADR: [0033](../../adr/0033-seo-test-perspective.md) (新規)、[0029](../../adr/0029-site-url-and-seo-metadata.md) (「結果」の観点の行を 0033 で置き換える)

## 背景・目的

1 段目 (PBI-0019・0020・0023) で title・canonical・sitemap・RSS・記事の BlogPosting は入った。まだ、持ち主を表す構造化データが無い、404 が Next.js の既定のまま、各ページの description が短い、/theme が索引の対象、という穴が残っている。外部の監査道具 [jev-seo](https://github.com/AgriciDaniel/jev-seo) の検査の考え方を借りて、これらを直し、同じ観点を自前のテスト (新しい seo 観点) に写す。詳細は仕様。

## やること

- Person・WebSite の構造化データを全ページに出し、/overview に ProfilePage を出す
- 自前の 404 (タブ付き・日本語・導線あり・canonical なし)
- 固定のページの description を 50〜120 文字に書き直す (文言は持ち主が承認した案)
- og:image を版の分かる URL にし、og:locale を足す
- /career・/works の見出しの段の飛びを直す
- /theme を道具のページとして noindex にし、sitemap から外す
- セキュリティヘッダー (nosniff・Referrer-Policy・frame-ancestors 'none')
- テスト観点 seo を新しく作り、app の全ページで必須にする (ADR 0033)
- 監査の手順書 (`docs/agents/seo-audit.md`)

## やらないこと

- 記事にかかわる部分 (記事の先頭の見出しの二重と段の詰め、抜粋、BlogPosting の image・publisher、BreadcrumbList)。PBI-0024 (記事の画像) のマージの後に、この PBI の続きとして入れる
- 正のホストと転送の向きを揃えること (PBI-0027)
- そのほか仕様の Out of Scope

## 受け入れ条件

| # | 条件 | 確かめ方 |
| --- | --- | --- |
| 1 | 全ページ (トップと /now/[id] を含む) で、title が辞書の期待値と一致し、canonical が自分の正のホストの URL を指し、自サイトの絶対 URL がすべて正のホストで始まり、h1 が 1 つ | e2e/seo-pages.spec.ts (@seo) |
| 2 | 全ページに WebSite と Person の構造化データがあり、Person は 1 ページに 1 つ。/overview には ProfilePage があり、mainEntity が Person の `@id` を指す | e2e/seo-structured-data.spec.ts (@seo)、test/lib/structured-data.test.ts |
| 3 | 存在しない URL と知らない記事の id で、サイトの見た目の 404 が 404 で出て、canonical と og:url が無く、トップ・/now・/works への導線がある。英語の表示でも文言が出る | e2e/not-found.spec.ts (@seo) |
| 4 | 固定のページの ja の description が 50〜120 文字で、title がページごとに違う。en の辞書が同じ項目を持つ | test/data/messages-seo.test.ts |
| 5 | og:image と twitter:image が版の分かる URL で、og:locale が ja_JP | test/lib/metadata.test.ts |
| 6 | /career・/works を含む固定のページで、見出しが段を飛ばさない | e2e/seo-headings.spec.ts (@seo) |
| 7 | /theme は noindex で sitemap に載らず、ほかの固定のページは載る。sitemap の URL は正のホストで、固定のページは 200 を返す | e2e/seo-noindex.spec.ts (@seo)、e2e/seo.spec.ts (@api-contract)、test/app/sitemap.test.ts |
| 8 | ページ・/now/[id]・404 の応答に 3 つのセキュリティヘッダーが付く | e2e/security-headers.spec.ts (@seo) |
| 9 | seo 観点が必須で、穴が無い | `pnpm test:coverage-map -- --check` |
| 10 | 監査の手順書がある | docs/agents/seo-audit.md |
| 11 | コミット前の検査に合格する | `pnpm commit-gate` |
