# PBI-0027 本番の正規ホストと siteUrl を揃え、canonical が転送されない URL を指すようにする

- 状態: 進行中 (方式は (a) に決定。持ち主の Vercel の設定変更待ち)
- 起票日: 2026-10-21
- 依頼者: リポジトリの持ち主 (PBI-0026 の調査中に見つかった件を切り出したもの)
- 作業記録: [WORK.md](WORK.md)
- 関連 ADR: [0029](../../adr/0029-site-url-and-seo-metadata.md)

## 背景・目的

- 2026-10-21 に curl で確かめると、`https://reeschan.pink/<path>` は 308 で `https://www.reeschan.pink/<path>` に転送される。Vercel のドメイン設定で www が正規 (primary) になっている
- 一方 `lib/metadata.ts` の `siteUrl` は `https://reeschan.pink` (ADR 0029)。canonical・`og:url`・sitemap の `<loc>`・robots の `Sitemap:`・RSS のリンク・JSON-LD の `author.url` は、すべて転送元の apex を指している
- 検索エンジンからは「canonical が転送される URL を指している」ように見える。canonical とリダイレクトの向きが逆なので、どちらを正規として扱うかの判断を検索エンジン任せにしてしまう。sitemap の URL もすべて転送を挟む
- 正規のホストを 1 つに決め、配信の転送の向きと `siteUrl` を揃える

## やること

2026-10-21、持ち主が **(a) apex を正規にする** を選んだ (比較は [WORK.md](WORK.md))。

- 持ち主が Vercel の Domains で `reeschan.pink` を primary にし、`www.reeschan.pink` → `reeschan.pink` に 308 で転送させる。手順は [WORK.md](WORK.md) の「Vercel の設定の手順」
- コードは変えない。`siteUrl` は `https://reeschan.pink` のまま
- ADR 0029 に「配信の正規ホストを `siteUrl` に合わせ、www は apex へ 308 で転送する」決まりと、変えたあとの確かめ方を書き足す

## やらないこと

- 表示の速さの改善 (PBI-0025・0026)
- `siteUrl` を www に変えること (比べたうえで選ばなかった方式 (b))
- DNS のレコードの変更
- Search Console への登録やサイトマップの送信 (持ち主が必要なら行う)

## 受け入れ条件

| # | 条件 | 確かめ方 |
| --- | --- | --- |
| 1 | 本番の canonical (`link[rel=canonical]`)・`og:url`・sitemap の `<loc>`・robots の `Sitemap:` が、転送されない URL (200 を返す URL) を指す | 持ち主の設定変更後に `curl -sI https://reeschan.pink/` などが 200 を返す (canonical はすでに apex を指している) |
| 2 | www は同じパスの apex へ 308 で転送される | `curl -sI https://www.reeschan.pink/career` が 308 で `Location: https://reeschan.pink/career` |
| 3 | コードを変えないので、既存の E2E とユニット (canonical・OGP・sitemap・robots を `siteUrl` と突き合わせるもの) はそのまま通る | PR の CI (lint・型・ユニット・ビルド)、develop へのマージ後の E2E |
| 4 | ADR 0029 に、正規のホストと配信の転送の向きを揃える決まりと確かめ方が書かれている | ADR の差分 |
