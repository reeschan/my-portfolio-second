# WORK-0027 本番の正規ホストと siteUrl を揃え、canonical が転送されない URL を指すようにする

PBI: [PBI.md](PBI.md)

## 計画

- [x] 本番の転送と canonical の現状を curl で確かめる — 下の「記録」に結果
- [x] (a) と (b) の比較を書き、持ち主に確認する — この下の「比較」。2026-10-21 は (a) に決まった (2026-10-22 に (b) に改めた。今の方式は (b))
- [x] ADR 0029 に、正規のホストと配信の転送の向きを揃える決まりを書き足す (2026-10-21、(a) のときの決まり。下で (b) に書き直した) — ADR の差分
- [x] 方式を (b) に改める (2026-10-22、持ち主の判断) — 下の「記録」
- [x] `siteUrl` を www にし、`ogImageVersion` を 2 に上げる — lib/metadata.ts、test/lib/metadata.test.ts
- [x] ADR 0029 の決定を「正規ホストは www」に書き直す — ADR の差分
- [x] リリース (develop → main) のあと、本番で canonical・sitemap・RSS が www を指すことを確かめる — 下の「リリース後の確かめ方」
- [x] 確かめたら PBI の状態を「完了」にする

## リリース後の確かめ方

Vercel の Domains は変えない (www が primary、apex は www へ 308)。コードの変更が main に出たあとに確かめる。

```bash
curl -sI https://www.reeschan.pink/career | grep -iE "^(HTTP|location)"
curl -sI https://reeschan.pink/career | grep -iE "^(HTTP|location)"
curl -s -A Googlebot https://www.reeschan.pink/career | grep -oE '<link rel="canonical"[^>]*>'
curl -s https://www.reeschan.pink/sitemap.xml | grep -oE '<loc>https?://[^/<]+' | sort | uniq -c
curl -s https://www.reeschan.pink/robots.txt | grep -i sitemap
curl -s https://www.reeschan.pink/rss.xml | grep -oE '<link>https?://[^/<]+|atom:link href="https?://[^/"]+' | sort | uniq -c
```

記事のページは sitemap に載っている分を 1 本ずつ見る (ステータス・canonical・`og:url`・noindex)。

```bash
for u in $(curl -s https://www.reeschan.pink/sitemap.xml | grep -oE '<loc>[^<]*/now/[^<]+' | sed 's/<loc>//'); do
  h=$(curl -s -A Googlebot -D - "$u")
  echo "$u | $(printf '%s' "$h" | head -1 | tr -d '\r') | $(printf '%s' "$h" | grep -oE '<link rel="canonical" href="[^"]*"') | $(printf '%s' "$h" | grep -oE '<meta property="og:url" content="[^"]*"') | noindex=$(printf '%s' "$h" | grep -ciE noindex)"
done
```

- 1 行目は `HTTP/1.1 200 OK` で `Location` が無い
- 2 行目は `HTTP/1.1 308 Permanent Redirect` と `Location: https://www.reeschan.pink/career`
- 3〜5 行目は、canonical・`<loc>`・`Sitemap:` がすべて `https://www.reeschan.pink/...` (転送されない URL を指している)。4 行目はホストごとの件数で、`https://www.reeschan.pink` の 1 行だけになる
- 6 行目は、RSS のチャンネルと記事の `<link>`、`atom:link` の href のホストごとの件数で、`https://www.reeschan.pink` だけになる
- 記事のページは、どれも `HTTP/1.1 200 OK`、canonical と `og:url` が自分自身の www の URL、`noindex=0`
- 確かめたら、Search Console のインデックス登録レポートで「ページにリダイレクトがあります」の「修正を検証」を押し、sitemap (`https://www.reeschan.pink/sitemap.xml`) を送り直す。apex の URL は転送元としてこの項目に残るが、正常

## 比較

| | (a) apex を正規にする (www → apex に転送) | (b) siteUrl を www に変える |
| --- | --- | --- |
| コードの変更 | なし (ADR に決まりを書き足すだけ) | `lib/metadata.ts` の 1 行。テストは `siteUrl` から期待値を作るので追従する |
| 作業する人 | 持ち主が Vercel の Domains で `reeschan.pink` を primary にする (www の Redirect を apex に向ける) | エージェントが PR を出す。マージして main にリリースされるまで直らない |
| ADR 0029 との関係 | 決定をそのまま保つ | `siteUrl` の値を変える (決定の形は同じ) |
| アドレスバーの表示・OGP の画像の文字 | `reeschan.pink` のまま | `displayHost = siteUrl.host` なので `www.reeschan.pink` になる。短いまま見せたいなら `displayHost` を `siteUrl` と切り離す追加の変更が要る |
| 既に外に出た URL | apex のリンク・RSS の購読はそのまま正規。www のリンクは転送される | apex のリンク・RSS の購読は今と同じく転送で届く |
| 一般的な向き | apex は CNAME を張れず A レコードになる。Vercel の DNS を使っていれば実害は小さい | Vercel がドメインを足すときに既定で勧める形 (今の設定がこれ) |
| 反映の速さ | 設定を変えた直後 | リリース PR (develop → main) のマージ後 |

2026-10-21 の推奨は **(a)** だった (2026-10-22 に持ち主が (b) に改めた。理由は「記録」)。ADR 0029 の決定と、サイトの各所に出している短いドメインの表示をそのまま保てて、コードの変更が要らない。持ち主の操作 1 つで直る。www を正規にしたい理由 (Vercel の既定に揃えたい、将来 CDN を挟むなど) があれば (b)。

## ADR が要る判断

- 新しい ADR は要らない。ADR 0029 の決定を書き直す (正規ホストを apex から www に。値の変更と、変えたあとの確かめ方)

## 記録

- 2026-10-21: 起票。PBI-0026 の調査で本番の TTFB を測ったときに、apex → www の 308 に気づいたもの。curl で確かめた結果:
  - `https://reeschan.pink/` → 308、`Location: https://www.reeschan.pink/` (`/career` も同じパスへ 308)
  - `https://www.reeschan.pink/career` は 200。HTML の canonical は `https://reeschan.pink/career`、`og:url` も apex
  - `https://www.reeschan.pink/robots.txt` の `Sitemap:` は `https://reeschan.pink/sitemap.xml`、sitemap の `<loc>` もすべて apex
- 2026-10-21: (a) と (b) を比べ、持ち主に確認を出した
- 2026-10-21: 持ち主の回答は (a)「Vercel の Domains で reeschan.pink を primary にし、www から apex へ 308 で転送する。コードは変えない。Vercel の設定はご自身で変更する」。ADR 0029 に決まりを書き足し、Vercel の設定の手順と確かめ方をこのファイルに書いた。コードの変更はないので E2E は足さない
- 2026-10-22: Search Console から「ページにリダイレクトがあります」で索引に載らないページがあると通知が来た。curl で確かめると、Vercel は変わらず apex → www の 308 で、canonical・sitemap・robots の `Sitemap:` は apex のままだった (原因はこの PBI の食い違い)
- 2026-10-22: 持ち主が方式を (b) に改めた (「Vercel は今のまま (apex → www) にして、siteUrl を https://www.reeschan.pink に変える」)。どちらの方式でも片方のホストからの転送は残り、要るのは向きと `siteUrl` を揃えることだけなので、配信の設定に触らずコードの 1 行で揃える方を選んだ
- 2026-10-22: `siteUrl` を www にした。テストは `siteUrl` を import して期待値を作っているので、値の変更だけで追従した。`displayHost` も `siteUrl.host` なので、アドレスバーの表示と OGP の画像の文字が `www.reeschan.pink` になる。画像が変わるので `ogImageVersion` を 2 に上げた。Vercel の primary と一緒に変える値だと分かるよう、`siteUrl` が www を指すユニットテストを足した

- 2026-10-22: PR #72 で develop にマージし、リリース PR #73 (develop → main、22:13 JST) で本番に出た
- 2026-10-23: 本番で「リリース後の確かめ方」の curl を流し、受け入れ条件 1・2・6 を満たすことを確かめた。PBI を完了にした
  - `https://www.reeschan.pink/career` は 200 (`Location` なし)。`https://reeschan.pink/career` は 308 で `Location: https://www.reeschan.pink/career`。canonical は `https://www.reeschan.pink/career`
  - sitemap の `<loc>` は 11 件すべて `https://www.reeschan.pink`。robots の `Sitemap:` は `https://www.reeschan.pink/sitemap.xml`
  - RSS は `<link>` 4 件 (チャンネル 1・記事 3) と `atom:link` 1 件が、すべて `https://www.reeschan.pink`
  - sitemap に載っている記事 3 件は、どれも 200、canonical と `og:url` が自分自身の www の URL、noindex なし
  - Search Console の「修正を検証」と sitemap の送り直しは、持ち主が行う (この PBI の範囲外)

## 検証

最後に実行したコマンドと結果。

- `pnpm commit-gate` (lint・型・ユニット・必須観点・E2E): 2026-10-22、PR #72 のコミットの前に合格 (E2E 224 件)。RSS のホストのアサーションを足したコミット (81a8f33) の前にも合格 (E2E 224 件)
- 本番の確かめ (上の curl): 2026-10-23 にリリース後の本番で流し、すべて期待どおり (「記録」の最後の項目)
