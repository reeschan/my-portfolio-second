# WORK-0014 「準備中」のお知らせを消し、右上で日本語と英語を切り替えられるようにする

PBI: [PBI.md](PBI.md)

## 計画

- [x] お知らせのバナーと RSS の「準備中」の記事を消す — e2e/i18n.spec.ts で「準備中」が 0 件
- [x] 言語の設定 (`lib/i18n/`) と Server Function、Client Component 向けの Context を作る — ユニットテスト
- [x] 画面の文言を `data/messages/ja.ts` / `en.ts` に移し、英語のデータを `data/en/` に足す — 型で文言の漏れを検出、test/data/localized.test.ts
- [x] 右上のスイッチ (`LocaleSwitch`) を置く — e2e/i18n.spec.ts
- [x] 既存の E2E を直す (バナーのテストを消し、背景テーマの名前を `data/messages/` から読む) — `pnpm test:e2e`

## ADR が要る判断

- [ADR 0026](../../adr/0026-locale-cookie-and-dictionaries.md): 言語は Cookie で持ち、文言は自前の辞書で持つ (ライブラリを入れない)

## 記録

- 2026-10-12: 依頼は「上の準備中は消して、EN と JP を右上で切り替えられるようにして」。「準備中」は全ページ上部の `AnnouncementBanner` と RSS の記事の 2 か所だった
- 2026-10-12: 方針を 3 案 (Cookie / URL を言語で分ける / 固定の文言だけ訳す) で示し、持ち主が Cookie 方式を選んだ
- 2026-10-12: データの英語版は `data/en/` に置き、日本語版と組にする入口を `data/localized.ts` にまとめた。`data/works.ts` から `data/en/works.ts` を import すると、英語版が日本語版の値を読むため循環して初期化前に参照してしまうので、data/*.ts からは英語版を import しない
- 2026-10-12: 背景テーマの表示名と説明は `lib/background-theme.ts` から `data/messages/` に移した (表示する文言は data/ に置く決まりに合わせる)。スキルのカテゴリには言語によらない `id` を足し、タブとの対応を名前ではなく id で取るようにした
- 2026-10-12: スイッチの選択中の見た目を `bg-primary` + 白文字にしたら axe のコントラスト (2.94:1) で落ちたので、タブの現在地と同じく `text-primary` に薄い面を敷く形にした
- 2026-10-12: ルートのレイアウトで `cookies()` を読むので、全ページがリクエストごとの描画になる (ADR 0026 の「結果」)
- 2026-10-12: 経歴の英語の社名は、東京海上日動システムズを「Tokio Marine & Nichido Systems Co., Ltd.」、網屋を「AMIYA Corporation」とした (各社の英語表記)

## 検証

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test:unit   # 通過 (ユニット 188 件)
pnpm build && CI=1 pnpm test:e2e                                      # 128 passed (desktop + mobile)
```
