# PBI-0019 サイトの URL を reeschan.pink に揃え、検索と共有に備える

- 状態: 進行中
- 起票日: 2026-10-13
- 依頼者: リポジトリの持ち主
- 作業記録: [WORK.md](WORK.md)
- 関連 ADR: [0029](../../adr/0029-site-url-and-seo-metadata.md)

## 背景・目的

- アドレスバー風の帯と RSS の既定値に `myportfolio.vercel.app` が書かれていた。本番の URL ではなく、他人のサイトの可能性もある。持ち主は独自ドメイン `reeschan.pink` で公開したい
- 概要・経歴・スキルとトップは、タブのタイトルがサイト名だけだった。既定の説明は英語の定型文で、OGP の画像・canonical・sitemap・robots もなかった。検索結果や SNS に URL を貼ったときに、何のページか伝わらない

## やること

- 本番の URL を `lib/metadata.ts` の 1 か所に置き、アドレスバーの表示・RSS・canonical・OGP・sitemap・robots をそこから作る
- 全ページにページ固有のタイトル・説明・canonical・OGP・Twitter Card を付ける。トップはサイトの説明を日英で持つ
- OGP の画像を `app/opengraph-image.tsx` で作る
- `app/sitemap.ts` と `app/robots.ts` を足す。API は巡回させない

## やらないこと

- Vercel でのドメインの追加と DNS の設定 (持ち主が操作する)
- RSS に記事を載せること (別の PBI)
- 言語ごとに URL を分けること (ADR 0026 で Cookie にしている)
- 構造化データ (JSON-LD)

## 受け入れ条件

| # | 条件 | 確かめ方 |
| --- | --- | --- |
| 1 | アドレスバーに `reeschan.pink` + パスが出る | e2e/smoke.spec.ts (@smoke) |
| 2 | 各ページのタイトルが `<タブ名> \| サイト名`、説明・canonical・og:url・og:image・twitter:card を持つ | e2e/seo.spec.ts (@smoke) |
| 3 | トップはサイト名とサイトの説明を持ち、canonical が本番の URL | e2e/seo.spec.ts (@smoke) |
| 4 | `/opengraph-image` が 1200×630 の PNG を返す | e2e/seo.spec.ts (@api-contract) |
| 5 | `/robots.txt` が `/api/` を除き、sitemap を示す | e2e/seo.spec.ts、test/app/robots.test.ts |
| 6 | `/sitemap.xml` にトップとタブの全ページが本番の URL で載る | e2e/seo.spec.ts、test/app/sitemap.test.ts |
| 7 | lint・型・ユニット・書式・ビルドと必須観点の穴の検査が通る | `pnpm commit-gate` |
| 8 | ドメインを向けたあと、SNS のカード検証で画像とタイトルが出る | デプロイ後に持ち主が確かめる |
