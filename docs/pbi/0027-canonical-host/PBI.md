# PBI-0027 本番の正規ホストと siteUrl を揃え、canonical が転送されない URL を指すようにする

- 状態: 完了 (2026-10-23 に本番で確かめた)
- 起票日: 2026-10-21
- 依頼者: リポジトリの持ち主 (PBI-0026 の調査中に見つかった件を切り出したもの)
- 作業記録: [WORK.md](WORK.md)
- 関連 ADR: [0029](../../adr/0029-site-url-and-seo-metadata.md)

## 背景・目的

- 2026-10-21 に curl で確かめると、`https://reeschan.pink/<path>` は 308 で `https://www.reeschan.pink/<path>` に転送される。Vercel のドメイン設定で www が正規 (primary) になっている
- 一方 `lib/metadata.ts` の `siteUrl` は `https://reeschan.pink` (ADR 0029)。canonical・`og:url`・sitemap の `<loc>`・robots の `Sitemap:`・RSS のリンク・JSON-LD の `url` と `@id` は、すべて転送元の apex を指している
- 検索エンジンからは「canonical が転送される URL を指している」ように見える。canonical とリダイレクトの向きが逆なので、どちらを正規として扱うかの判断を検索エンジン任せにしてしまう。sitemap の URL もすべて転送を挟む
- 2026-10-22 には Search Console から「ページにリダイレクトがあります」で索引に載らないページがあると通知が来た
- 正規のホストを 1 つに決め、配信の転送の向きと `siteUrl` を揃える

## やること

2026-10-21 に持ち主は (a) apex を正規にする を選んだが、2026-10-22 に **(b) siteUrl を www に変える** に改めた (比較は [WORK.md](WORK.md))。Vercel の設定は変えずに、コードの 1 行で揃える。

- `lib/metadata.ts` の `siteUrl` を `https://www.reeschan.pink` にする。canonical・OGP・sitemap・robots・RSS・構造化データ・アドレスバーの表示は `siteUrl` から作っているので、すべて追従する
- OGP の画像に描くホストの文字が変わるので、`ogImageVersion` を 2 に上げる
- Vercel の Domains は今のまま (www が primary、apex は www へ 308)
- ADR 0029 の決定を「正規ホストは www」に書き直す

## やらないこと

- 表示の速さの改善 (PBI-0025・0026)
- Vercel の Domains の変更 (比べたうえで選ばなかった方式 (a))
- `displayHost` を `siteUrl` と切り離して、表示だけを apex に保つこと
- DNS のレコードの変更
- Search Console への登録やサイトマップの送信 (持ち主が必要なら行う)

## 受け入れ条件

| # | 条件 | 確かめ方 |
| --- | --- | --- |
| 1 | 本番の canonical (`link[rel=canonical]`)・`og:url`・sitemap の `<loc>`・robots の `Sitemap:` が、転送されない www の URL (200 を返す URL) を指す | リリース後に [WORK.md](WORK.md) の「リリース後の確かめ方」の curl |
| 2 | apex は同じパスの www へ 308 で転送される (今の Vercel の設定のまま) | `curl -sI https://reeschan.pink/career` が 308 で `Location: https://www.reeschan.pink/career` |
| 3 | 既存の E2E とユニット (canonical・OGP・sitemap・robots・構造化データを `siteUrl` と突き合わせるもの) が、値を変えたあとも通る | `pnpm commit-gate` (lint・型・ユニット・必須観点・E2E) |
| 4 | `siteUrl` が www を指すことをユニットで確かめる (Vercel の primary と一緒に変える値だと分かるように) | test/lib/metadata.test.ts |
| 5 | ADR 0029 に、正規ホストを www にした決定と、変えたあとの確かめ方が書かれている | ADR の差分 |
| 6 | 本番の `/rss.xml` の `<link>` と `atom:link` の href が www のホストを指す | リリース後に [WORK.md](WORK.md) の「リリース後の確かめ方」の curl (RSS の行) |
