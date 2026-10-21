# WORK-0027 本番の正規ホストと siteUrl を揃え、canonical が転送されない URL を指すようにする

PBI: [PBI.md](PBI.md)

## 計画

- [x] 本番の転送と canonical の現状を curl で確かめる — 下の「記録」に結果
- [x] (a) と (b) の比較を書き、持ち主に確認する — この下の「比較」。(a) に決まった
- [x] ADR 0029 に、正規のホストと配信の転送の向きを揃える決まりを書き足す — ADR の差分
- [ ] 持ち主が Vercel の Domains を変える — 下の「Vercel の設定の手順」
- [ ] 本番で apex が 200、www が apex への 308 になる — 下の「設定を変えたあとの確かめ方」
- [ ] 確かめたら PBI の状態を「完了」にする

## Vercel の設定の手順 (持ち主が行う)

Vercel のプロジェクトの Settings → Domains で操作する (画面の文言は変わっていることがある)。

1. `reeschan.pink` の Edit を開き、今の「`www.reeschan.pink` へ転送」をやめて Production に直接つなぐ。先にこちらを変えないと、2 つのドメインが互いに転送し合う形になりうる
2. `www.reeschan.pink` の Edit を開き、`reeschan.pink` への転送にする。状態コードは 308 (Permanent Redirect)
3. 一覧で `reeschan.pink` が primary (転送なし)、`www.reeschan.pink` が `reeschan.pink` への転送になっていることを見る

DNS のレコードは変えない (どちらのホストもすでに Vercel に届いている)。

## 設定を変えたあとの確かめ方

```bash
curl -sI https://reeschan.pink/ | grep -iE "^(HTTP|location)"
curl -sI https://reeschan.pink/career | grep -iE "^(HTTP|location)"
curl -sI https://www.reeschan.pink/career | grep -iE "^(HTTP|location)"
curl -s https://reeschan.pink/career | grep -oE '<link rel="canonical"[^>]*>'
```

- 1 行目と 2 行目は `HTTP/1.1 200 OK` で `Location` が無い
- 3 行目は `HTTP/1.1 308 Permanent Redirect` と `Location: https://reeschan.pink/career`
- 4 行目の canonical は `https://reeschan.pink/career` (転送されない URL を指している)

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

推奨: **(a)**。ADR 0029 の決定と、サイトの各所に出している短いドメインの表示をそのまま保てて、コードの変更が要らない。持ち主の操作 1 つで直る。www を正規にしたい理由 (Vercel の既定に揃えたい、将来 CDN を挟むなど) があれば (b)。

## ADR が要る判断

- 新しい ADR は要らない。ADR 0029 に「配信の転送の向きを `siteUrl` に合わせる」決まりを書き足す (b のときは値の変更も)

## 記録

- 2026-10-21: 起票。PBI-0026 の調査で本番の TTFB を測ったときに、apex → www の 308 に気づいたもの。curl で確かめた結果:
  - `https://reeschan.pink/` → 308、`Location: https://www.reeschan.pink/` (`/career` も同じパスへ 308)
  - `https://www.reeschan.pink/career` は 200。HTML の canonical は `https://reeschan.pink/career`、`og:url` も apex
  - `https://www.reeschan.pink/robots.txt` の `Sitemap:` は `https://reeschan.pink/sitemap.xml`、sitemap の `<loc>` もすべて apex
- 2026-10-21: (a) と (b) を比べ、持ち主に確認を出した
- 2026-10-21: 持ち主の回答は (a)「Vercel の Domains で reeschan.pink を primary にし、www から apex へ 308 で転送する。コードは変えない。Vercel の設定はご自身で変更する」。ADR 0029 に決まりを書き足し、Vercel の設定の手順と確かめ方をこのファイルに書いた。コードの変更はないので E2E は足さない

## 検証

最後に実行したコマンドと結果。

- ドキュメントだけの変更なので、commit-gate は検査を省く (`scripts/commit-gate.mjs` の `isDocsOnly`)
- 本番の確かめ (上の curl) は、持ち主の設定変更後に行う
