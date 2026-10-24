# PBI-0034 /now の記事の英語版

- 状態: 進行中
- 起票日: 2026-10-24
- 依頼者: リポジトリの持ち主
- 作業記録: [WORK.md](WORK.md)
- 関連 ADR: [0037](../../adr/0037-now-post-english-auto-translation.md)、[0026](../../adr/0026-locale-cookie-and-dictionaries.md)、[0035](../../adr/0035-cache-components-and-prefetch.md)
- 仕様: [docs/specs/now-post-english.md](../../specs/now-post-english.md)

## 背景・目的

表示言語を英語にしても、/now の記事だけは日本語のまま出る。英語で閲覧する人 (海外の採用担当や発注者) が記事を読めるよう、記事の**英語版**を持たせる。持ち主は日本語で投稿するだけで済むよう、英語版はサイトが LLM (Kimi) で自動で作る (ADR 0037)。

## やること

- 記事に任意の英語版 (`en`: 題名・本文・自動訳か持ち主の訳か・保存日時) を持たせる
- 投稿・書き換えのあと (`after()`) に自動訳を作って保存する。日本語が変わったときだけ訳し直す。失敗は Slack に知らせる
- 持ち主の訳の API: `PUT /api/now/[id]/en`、`DELETE /api/now/[id]/en`、`POST /api/now/[id]/en/translate`
- 表示言語が英語のとき、一覧のカードと記事のページ (metadata・JSON-LD を含む) で英語版を出す。英語版の無い記事は日本語に断り書きと `lang="ja"`、自動訳には「Machine-translated」を添える
- 一覧の下の一律の断り書き (`languageNote`) を消す

## やらないこと

- 英語版を検索エンジンに載せること (URL を言語で分ける、hreflang)
- 英語の RSS、Slack の知らせの英語化
- 図 (Mermaid) の中の文字・文字入りの画像の英語版、英語版のための別の画像
- 今ある記事をまとめて訳す仕組み (訳し直しの API を 1 件ずつ呼ぶ)
- 訳の質を測る eval

## 受け入れ条件

| # | 条件 | 確かめ方 |
| --- | --- | --- |
| 1 | 投稿のあとに自動訳が `source: "auto"` で保存され、作り置きが捨てられる | test/app/api/now/route.test.ts (api-contract) |
| 2 | 書き換えで日本語が変わると英語版が外れて訳し直され、変わらなければ英語版が残り LLM を呼ばない | test/app/api/now/[id]/route.test.ts |
| 3 | API キーが無いと訳さず Slack にも知らせない。訳に失敗すると英語版なしのまま Slack に知らせる | test/app/api/now/route.test.ts |
| 4 | 訳している間に記事が消えた・日本語が変わった・英語版が変わったときは訳を保存しない | test/app/api/now/route.test.ts |
| 5 | 自動訳は画像の参照・コードブロックを変えた訳や、LLM の失敗を失敗として返す | test/lib/now/translate.test.ts |
| 6 | `PUT /en` (JSON・multipart) で持ち主の訳を保存し、記事に無い画像の参照は 400。`DELETE /en` は 204 | test/app/api/now/[id]/en/route.test.ts (api-contract) |
| 7 | `POST /en/translate` は成功で 200、訳の失敗で 502、API キーなしで 503、記事なしで 404。訳の間に記事が消えたら 404、日本語か英語版が変わったら 409 で保存しない | test/app/api/now/[id]/en/translate/route.test.ts (api-contract) |
| 8 | 記事と表示言語から、出す題名・本文・言語・断り書きが決まる (自動訳の断り書きを含む) | test/lib/now/localize.test.ts |
| 9 | 英語のとき、英語版のある記事はカードと記事のページ (`<title>` を含む) に英語版が出る。日本語のときは日本語 | e2e/now-english.spec.ts |
| 10 | 英語のとき、英語版の無い記事は日本語と断り書きで出る | e2e/now.spec.ts・e2e/now-post-page.spec.ts |
| 11 | lint・型・ユニット・ビルド・観点の表の検査が通る | `pnpm check`、`pnpm test:coverage-map -- --check` |
| 12 | Vercel のプレビューで、`after()` の自動訳が保存されて英語版が出ること、`maxDuration = 300` が通ることを持ち主が確かめる | 手動 (WORK に記録) |
