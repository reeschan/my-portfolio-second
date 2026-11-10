# 0039. トップ (/) を概要にし、導入演出をなくす

- 状態: 承認
- 日付: 2026-11-10
- 関連: [0034](0034-intro-and-background-handoff.md) (置き換え)、[0035](0035-cache-components-and-prefetch.md)、[0004](0004-design-theme.md)、[0012](0012-background-themes.md)、[docs/specs/top-overview.md](../specs/top-overview.md)、[PBI-0038](../pbi/0038-top-overview/PBI.md)

## 背景

トップ (`/`) を開くと、5 秒の導入演出のあとに名前と「Enter」だけの画面が出て、中身を見るにはもう一度押す必要があった。初めて来た閲覧者 (採用担当や発注者) は、最初の 1 画面で何のサイトかが分からない。検索エンジンから見ても、トップは文字の少ない薄いページになっている。

概要ページ (`/overview`) には自己紹介と各ページへの案内がそろっているのに、そこへは導入演出を通ってからでないと着けない。導入演出を保つために、専用の部品・CSS Modules・絵・文言・トークン・テストも抱えていた。

## 決定

- **`/` で概要の中身をそのまま出す。** `app/(tabs)/overview/page.tsx` を `app/(tabs)/page.tsx` に移し、導入演出のトップ (`app/page.tsx`) は消す。2 つが同時にあると `/` が重なるので、同じ変更で行う。タブの並び (`lib/navigation.ts`) の概要の `href` は `/` にし、`browser-tabs.tsx` の `pathname === item.href` で「概要」のタブが選ばれるようにする
- **`/overview` は `/` へ 308 で転送する。** `next.config.ts` の `redirects()` に `source: "/overview"`、`destination: "/"`、`permanent: true` を置く
  - proxy.ts を使わないのは、`/now` の転送が `?post=` を転送先に残さないためのものだから。`/overview` ではクエリ (utm など) を残してよい
  - `redirects` はページにも proxy にも届く前に返り、proxy の matcher を広げずに済む。クエリは転送先に残る (`/overview?utm_source=x` は `location: /?utm_source=x` を返した。2026-11-10 に `next start` で確認)
  - `headers()` (`source: "/:path*"`) のセキュリティヘッダは、`next start` の 308 には付かなかった (`/career` の 200 には付く。Vercel では未確認)。308 には守る本文が無いので、このまま受け入れる
- **`/` の metadata は概要のもののまま、path だけ `/` にする。** title は「概要 | Ryuki Tobita's Portfolio」(`pageTitle(messages.nav.overview)`)、description も概要の説明。h1 は「概要」/ "Overview"。ほかのタブのページと形を揃える (持ち主が 2026-11-10 に選んだ)
  - 構造化データの ProfilePage の url は `siteUrl` (`/`)。sitemap は `/` を 1 回だけ載せる (固定の `/` と navItems の `/` が重ならないようにする)
- **導入演出のためのものを全部消す。** `components/features/intro/` (部品と CSS Modules)、`lib/intro/`、`public/intro/` の絵、`data/messages` の `intro` キー (ja と en を同時に)、`app/globals.css` の `--intro-*`・`--color-intro-*`、導入演出の入口にだけ使っていた `glass-button` と `--glass-highlight`
- **背景の準備完了の通知を消す。** `lib/background-load.ts` のうち、読み込みを始める部分は全ページの背景が使うので残す。準備完了を伝える後半と、`scene.tsx` の Notifier は導入演出だけが読んでいたので消す
- **`lib/theme.ts` の `introColors` は `glassColors` に改名して残す。** 使うのは glass テーマの背景で、値は変えない
- **grid テーマの「トップではパーティクルを増やす」(`pathname === "/"`) をやめ、全ページで 200 にする。** 概要がトップになったので、残すと概要とほかのタブを行き来するたびに粒が並び直る (持ち主が 2026-11-10 に選んだ)
- **過去の記録は消さない。** [0034](0034-intro-and-background-handoff.md) は状態を「置き換え済み」にし、[0035](0035-cache-components-and-prefetch.md)・[0004](0004-design-theme.md)・[0012](0012-background-themes.md) のトップや導入演出に触れる記述には追記で印を付ける。[docs/specs/intro-complete.md](../specs/intro-complete.md)・[intro-handoff.md](../specs/intro-handoff.md) は冒頭に「廃止」の印を付けて残す

## 検討した選択肢

| 選択肢 | 良い点 | 悪い点 |
| --- | --- | --- |
| `/` に概要を出し、`/overview` を 308 で `/` へ (採用) | トップを開いた瞬間に自己紹介と案内が読める。古いリンクと検索結果は `/` に寄る。文字の多いトップが検索に載る | 導入演出とその世界観を失う。既存の `/overview` を前提にしたテスト・文書を書き換える |
| `/` から `/overview` へ転送し、導入演出を残す | 導入演出をそのまま保てる | 最初の 1 画面で何のサイトか分からないまま。押す手間も残る。検索から見ても薄いトップのまま |
| 導入演出の呼び出しだけ外し、コードと絵を残す | 戻すのが簡単 | 使われないコード・絵・文言・トークン・テストを抱え続ける。持ち主が「残したくない」と決めた |
| ページの中で `permanentRedirect()` を呼ぶ | `next.config.ts` を増やさない | Partial Prefetching で殻が先に 200 で返るので、転送が間に合わない (ADR 0035 で `/now` の 308 に proxy を使ったのと同じ理由) |
| proxy.ts に `/overview` を足す | 単体で確かめやすい | matcher を広げて全ページの応答で関数が走る。`/overview` はクエリを残してよいので `redirects` で足りる |

## 結果

- トップを開くとすぐに自己紹介と各ページへの案内が読める。見出しと本文が最初の HTML にあり、JS を切った閲覧者とクローラーも読める
- `/overview` のリンクとブックマーク、検索結果は 308 で `/` に移る。`/overview` はページとしても sitemap の行としても消える
- 概要とほかのタブを行き来しても、grid テーマの粒が並び直らない
- 受け入れること
  - 導入演出 (5 秒の演出と、演出から背景へ引き継ぐ見せ方) は失う
  - `/overview` の 2 段の転送 (`/overview/` → `/overview` → `/`) は、Next.js の末尾の `/` の正規化に任せる
- テストへの反映 (PBI-0038・最後のテストの段)
  - 消す: `e2e/intro.spec.ts`、`e2e/home.spec.ts`、`test/lib/intro/progress.test.ts`、`test/lib/background-load.test.ts` の準備完了の部分
  - 足す: `/overview` が 308 と `location: /` を返す E2E (`request.get` と `maxRedirects: 0`)、JS を切っても `/` に概要の本文が出る E2E (`e2e/seo-crawler-shell.spec.ts` の pages に `/`)
  - 直す: `/overview` を開いているテストを `/` に、全ページのループで `/` が 2 回出るもの (seo 系・a11y・theme) から重複を除く、`/` の title の期待値を「概要 | サイト名」に
  - 最後に `pnpm test:coverage-map -- --write` で `docs/testing/coverage-map.md` を作り直す
