# トップ (/) を概要にし、導入演出をなくす

- 日付: 2026-11-10
- PBI: [0038](../pbi/0038-top-overview/PBI.md)
- ADR: [0039](../adr/0039-top-is-overview.md) (置き換える ADR: [0034](../adr/0034-intro-and-background-handoff.md))

## Problem Statement

トップ (`/`) を開くと、5 秒の導入演出のあとに名前と「Enter」だけの画面が出て、中身を見るにはもう一度押す必要がある。初めて来た閲覧者 (採用担当や発注者) は、最初の 1 画面で何のサイトかが分からない。検索エンジンから見ても、トップは文字の少ない薄いページになっている (PBI-0037 の背景)。

## Solution

導入演出をやめ、`/` で今の概要ページの中身をそのまま出す。`/overview` は `/` へ 308 で転送し、古いリンクと検索結果を `/` に寄せる。導入演出のためだけにあったコード・絵・文言・トークン・テストはすべて消す。

## User Stories

1. 閲覧者として、トップを開いたらすぐに自己紹介と各ページへの案内を読みたい
2. 閲覧者として、トップでもタブの並びが見え、「概要」のタブが選ばれていてほしい
3. `/overview` のリンクやブックマークを持つ閲覧者として、開いたら `/` の概要に移ってほしい
4. JS を切った閲覧者やクローラーとして、`/` の最初の HTML で概要の本文を読みたい
5. 持ち主として、使われないコード (導入演出・背景の準備完了の通知・演出用のトークン) を残したくない

## Implementation Decisions

### ルート

- `app/(tabs)/overview/page.tsx` を `app/(tabs)/page.tsx` に移す (`git mv`)。`app/page.tsx` (導入演出のトップ) は消す。2 つが同時にあると `/` が重なるので、同じ変更で行う
- タブの並び (`lib/navigation.ts`) の概要の `href` を `/` にする。`browser-tabs.tsx` の `pathname === item.href` で、`/` のときに概要のタブが選ばれる
- `/overview` → `/` の 308 は `next.config.ts` の `redirects()` (`permanent: true`) で返す。proxy.ts で /now の転送をしているのは `?post=` を転送先に残さないためで、`/overview` ではクエリ (utm など) を残してよい。redirects ならページにも proxy にも届く前に返り、proxy の matcher を広げずに済む。ページの中の `permanentRedirect()` は、Partial Prefetching で殻が先に 200 で返るので使わない (ADR 0035)

### metadata と SEO

- `/` の title は今の概要と同じ「概要 | Ryuki Tobita's Portfolio」(`pageTitle(messages.nav.overview)`)、description も概要の説明 (`messages.overview.description`) のまま、path だけ `/` にする。ほかのタブのページと形を揃える (持ち主が 2026-11-10 に選んだ)。h1 は「概要」/ "Overview"
- 構造化データの ProfilePage の url を `/` (`siteUrl`) にする
- sitemap は `/` を 1 回だけ載せる (固定の `/` と navItems の `/` が重ならないようにする)

### 導入演出の削除

- 消す: `components/features/intro/` (部品と CSS Modules)、`lib/intro/`、`public/intro/` の絵、`data/messages` の `intro` キー (ja と en を同時に)
- 背景の読み込み (`lib/background-load.ts`) は、読み込みを始める部分を全ページの背景が使うので残す。準備完了の通知 (後半) と `scene.tsx` の Notifier は導入演出だけが読んでいたので消す
- `app/globals.css` の `--intro-*`・`--color-intro-*` と、導入演出の入口にだけ使っていた `glass-button`・`--glass-highlight` を消す
- glass テーマの配色 `lib/theme.ts` の `introColors` は、名前を `glassColors` に替えて残す (glass テーマの背景が使う。中身の値は変えない)
- 3D 背景の grid テーマの「トップではパーティクルを増やす」(`pathname === "/"`) はやめ、全ページで同じ数 (今のほかのページと同じ 200) にする。概要がトップになったので、残すと概要とほかのタブを行き来するたびに粒が並び直る (持ち主が 2026-11-10 に選んだ)

### 文書

- 新しい ADR 0039 に上の決定を書き、ADR 0034 を「置き換え済み (0039)」にする。0035・0004・0012 のトップや導入演出に触れる記述には追記で印を付ける
- `docs/specs/intro-complete.md`・`intro-handoff.md` は消さず、冒頭に「廃止 (ADR 0039)」の印を付ける
- README・AGENTS.md・CONTEXT.md・docs/design/theme.md・docs/specs のページの一覧を `/` = 概要に合わせる
- 過去の PBI の記録 (docs/pbi/0029 など) は直さない

## Testing Decisions

- テストは最後のテストの段でまとめて直す (atelier の tests-at-end)。作業者はテストを書かない
- 消す: `e2e/intro.spec.ts`、`e2e/home.spec.ts`、`test/lib/intro/progress.test.ts`、`test/lib/background-load.test.ts` の準備完了の部分
- 足す: `/overview` が 308 と `location: /` を返す E2E (`request.get` と `maxRedirects: 0`)、JS を切っても `/` に概要の本文が出る E2E (`e2e/seo-crawler-shell.spec.ts` の pages に `/`)
- 直す: `/overview` を開いているテストを `/` に、全ページのループで `/` が 2 回出るもの (seo 系・a11y・theme) から重複を除く、`/` の title の期待値を「概要 | サイト名」に
- 最後に `pnpm test:coverage-map -- --write` で docs/testing/coverage-map.md を作り直す

## Out of Scope

- 概要ページの中身・見た目の変更
- PBI-0037 (トップの画面下の帯)。取りやめる
- 使われていない `--animate-rise` / `--animate-fade-in` の整理
- 過去の PBI の記録の書き換え

## Further Notes

- 持ち主が承認の場 (2026-11-10) で決めたこと: `/` の title は「概要 | サイト名」/ grid の粒は全ページ同じ数 / PBI-0037 の作業フォルダは消す / セキュリティの段は流さない
- 前提として承認されたこと: `glass-button` と `--glass-highlight` を消す / `introColors` を `glassColors` に改名
- 調べた結果の詳細: docs/pbi/notes/understand.md (手元だけ)
