# 0029. 本番の URL はコードの 1 か所に固定し、検索と共有のメタデータをそこから作る

- 状態: 提案中
- 日付: 2026-10-13
- 関連: [PBI-0019](../pbi/0019-site-url-and-seo/PBI.md)、[PBI-0027](../pbi/0027-canonical-host/PBI.md) (2026-10-21 に正規ホストと配信の転送の向きを書き足した)

## 背景

- アドレスバー風の帯 (`lib/navigation.ts`) と RSS の既定値 (`app/rss.xml/route.ts`) に、本番ではない `myportfolio.vercel.app` が別々に書かれていた
- canonical・OGP・sitemap・robots は絶対 URL を要る。どこから URL を取るかを決めないと、同じ揺れが増える
- 持ち主は独自ドメイン `reeschan.pink` で公開する
- 表示言語は Cookie で切り替え、URL は 1 つ (ADR 0026)

## 決定

- 本番の URL を `lib/metadata.ts` の `siteUrl` に固定する。環境変数にはしない
- 配信の正規ホストは `siteUrl` と同じ apex (`reeschan.pink`) にする。Vercel の Domains で apex を primary にし、`www.reeschan.pink` は同じパスの apex へ 308 で転送する (PBI-0027)
  - canonical が転送される URL を指すと、検索エンジンはリダイレクトと canonical の食い違いをどちらで解くか自分で決めてしまう。sitemap の URL もすべて転送を挟む
  - ドメインの設定はコードの外にあり、テストでは確かめられない。Vercel の Domains を変えたら、`curl -sI https://reeschan.pink/` が 200、`curl -sI https://www.reeschan.pink/` が apex への 308 であることを確かめる
- アドレスバーの表示 (`displayHost`)・RSS・`metadataBase`・canonical・OGP・sitemap・robots はすべて `siteUrl` から作る
- ページの metadata は `pageMetadata()` で作る。Next.js は子の `openGraph` を親と深く混ぜないので、`siteName`・`type`・画像を毎回渡す
- OGP の画像は `app/opengraph-image.tsx` で `next/og` の `ImageResponse` を使い、ビルド時に作る。日本語のフォントを同梱しないため、文字は英語だけにする
- robots は `/api/` を除いて全体を許す。sitemap はトップと `lib/navigation.ts` の全ページを載せる
- 言語ごとの URL が無いので `hreflang` は出さない。Cookie を持たないクローラには日本語の metadata が出る

## 検討した選択肢

| URL の持ち方 | 良い点 | 悪い点 |
| --- | --- | --- |
| **コードに固定 (採用)** | プレビューのデプロイでも canonical が本番を指し、重複ページにならない。テストが同じ値を import できる | ドメインを変えるときはコードの変更が要る |
| 環境変数 (`NEXT_PUBLIC_BASE_URL`) | デプロイ先ごとに変えられる | 未設定のときの既定値がまた要り、揺れの元になる。E2E と値を共有しにくい |
| リクエストの Host から作る | 設定が要らない | プレビューの URL が canonical になり、検索エンジンに重複として扱われる |

| OGP の画像 | 良い点 | 悪い点 |
| --- | --- | --- |
| **`next/og` でコードから作る (採用)** | 名前・肩書き・ドメインを変えれば自動で追従する。トークンの色を使える | 日本語を出すにはフォントの同梱が要る |
| PNG を手で作って置く | 見た目を自由に作れる | 内容を変えるたびに作り直す |

## 結果

- 検索結果と SNS で、ページごとのタイトル・説明・画像が出る
- ドメインを変えるときは `siteUrl` を 1 行直せば全体が追従する。あわせて Vercel の Domains の primary と転送の向きも `siteUrl` に合わせる
- 新しいページは `pageMetadata()` を使い、`lib/navigation.ts` に足せば sitemap にも載る
- 新しい観点は足さない。E2E は `@smoke` と `@api-contract` で確かめる
