# PBI-0013 概要ページに自己紹介・外部リンク・各ページの案内を載せ、経歴の参画先を整える

- 状態: 進行中
- 起票日: 2026-10-12
- 依頼者: リポジトリの持ち主
- 作業記録: [WORK.md](WORK.md)
- 関連 ADR: なし

## 背景・目的

/overview は「ここにポートフォリオの概要を記載します。」という仮の一文だけで、初めて来た人が誰のサイトで、どこに何があるのか分からない。
持ち主がフルスタックデベロッパーであることと、GitHub・LinkedIn へのリンク、各ページの簡単な説明を載せたい。
あわせて、経歴の参画先「Stract」を正式な表記の「STRACT」に直し、個別に載せていない参画先があることを「Other」として示したい。

## やること

- 自己紹介 (名前・肩書き「フルスタックデベロッパー」・数段落の紹介)、外部のプロフィールへのリンク、各ページの案内を `data/overview.ts` に持ち、/overview に出す
- 各ページの案内はタブ (`lib/navigation.ts`) と同じ順に並べ、押すとそのページへ進める
- 経歴の参画先 `Stract` を `STRACT` にし、`Other` の参画先を足す
- 概要の本文に各ページへのリンクが増えるので、タブを名前で探す既存の E2E をタブの帯 (`ページ切り替え`) に絞る

## やらないこと

- /now の記事の追加 (記事は `POST /api/now` で投稿するもので、コードの変更ではない)

## 受け入れ条件

| # | 条件 | 確かめ方 |
| --- | --- | --- |
| 1 | /overview にプロフィールの見出し・肩書き・自己紹介が出る | e2e/content.spec.ts (/overview @content) |
| 2 | 外部のプロフィールのリンクが新しいタブ・`rel="noopener noreferrer"` で開く | e2e/content.spec.ts (/overview @content) |
| 3 | 概要以外のすべてのタブに案内があり、タブと同じ順に並び、押すとそのページへ進める | test/data/overview.test.ts、e2e/content.spec.ts (/overview @navigation) |
| 4 | 経歴の参画案件のダイアログに STRACT と Other が出る | e2e/interaction.spec.ts (/career @interaction)、e2e/content.spec.ts |
| 5 | タブのナビゲーションの E2E が今までどおり通る | e2e/navigation.spec.ts、e2e/smoke.spec.ts |
| 6 | lint・型・ユニット・書式・ビルドと、必須観点の穴の検査が通る | `pnpm check`、`pnpm test:coverage-map -- --check` |
