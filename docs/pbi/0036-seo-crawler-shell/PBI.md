# PBI-0036 JS を動かさないクローラーが本文を読めるようにする

- 状態: 完了
- 起票日: 2026-10-25
- 依頼者: リポジトリの持ち主
- 作業記録: [WORK.md](WORK.md)
- 関連 ADR: [0038](../../adr/0038-default-locale-shell.md)、[0035](../../adr/0035-cache-components-and-prefetch.md)、[0036](../../adr/0036-tab-page-heading-in-shell.md)

## 背景・目的

`/works`・`/now`・`/skills` の本文が、最初の HTML では `<div hidden id="S:">` の中にしか無い。この穴は JS が差し替えるので、JS を動かさないクローラー (一部の AI クローラーや、リンクのプレビュー) は本文を読めない。既知のボット向けの待ち (`htmlLimitedBots`) には入っていない相手でも読めるようにする。

あわせて、404 の twitter の題と説明がトップのままなことと、トップの h1 の文字が「Ryuki TobitaPortfolio」とくっつくことを直す。

## やること

- タブ付きのページの本文を、Cookie を読む `<Suspense>` の外に出し、既定の言語 (日本語) の本文を殻の fallback に置く。Cookie の言語が違えば、届いたところで差し替える
- `/works`・`/skills`・`/now` の本文が、`hidden id="S:"` の外の HTML にあることを E2E で確かめる
- 404 の `twitter:title` と `twitter:description` を、404 の題と説明に揃える
- トップの h1 の文字を「Ryuki Tobita Portfolio」にする。縦に並べた見た目は変えない

## やらないこと

- トップに自己紹介の一行を足すこと (導入演出の見出しの並びに収まる場所が無い。仕様の見出しは名前と Portfolio のまま)
- URL を言語で分けること、`htmlLimitedBots` の一覧を変えること
- 404 の本文を殻に出すこと (この PBI では twitter の題と説明だけ)
- 言語の切り替え、Cache Components、先読みをやめること

## 受け入れ条件

| #   | 条件                                                                                   | 確かめ方                                                                           |
| --- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1   | `/works`・`/skills`・`/now` の本文が、初期 HTML の `hidden id="S:"` の外にある         | e2e/seo-crawler-shell.spec.ts (@seo)。本番ビルドの HTML を curl して同じことを見る |
| 2   | 英語の Cookie では英語の見出しと本文になる。先読みを落としても見出しとパネルが消えない | 既存の e2e/i18n.spec.ts、e2e/navigation.spec.ts                                    |
| 3   | 404 の twitter:title と twitter:description が 404 の文言と一致する                    | e2e/not-found.spec.ts (@seo)                                                       |
| 4   | トップの h1 の文字が「Ryuki Tobita Portfolio」で、名前と Portfolio は縦に並んだまま    | e2e/home.spec.ts、e2e/intro.spec.ts、e2e/content.spec.ts                           |
