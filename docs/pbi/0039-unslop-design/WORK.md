# WORK-0039 unslop の観点で見た目の AI っぽさを取る

PBI: [PBI.md](PBI.md)

## 計画

atelier (v5) で 7 つの作業に分けた。波 1 で 1〜5、波 2 で 6・7、最後にテストの段とレビュー。

- [x] カードとタブのホバーを色と面の変化だけにし、記事の日付を等幅にする — 押せるカードのクラスに translate・scale・transition-all が無い
- [x] h1 を font-semibold にし、小さい見出しの tracking-tight を外す — 全ページの h1 の太さ
- [x] チャットの文言から「！」と末尾の「...」を取る — /chat の E2E
- [x] 経歴のカードの青線と影、点の青をやめ、バッジを角丸に、日付とタグを等幅にする — /career の E2E
- [x] アバターと資格の囲みから青と影を外す — / と /skills の E2E
- [x] 書体を Geist と Geist Mono に替え、アドレスバーの URL を等幅にする — `pnpm build` と theme の E2E
- [x] theme.md と ADR 0004 を更新する — レビュー
- [x] テストの段 (E2E を足す) と `pnpm test:coverage-map -- --write`
- [x] `pnpm commit-gate` (コミットの直前に流す)

## ADR が要る判断

- 要る。トークン `--font-mono` を足し、書体・アクセントの使いどころ・影の決まりを変えるので、[ADR 0004](../../adr/0004-design-theme.md) に追記する

## 記録

- 2026-11-10: heydamir/unslop の README・SKILL.md・signs.md・tokens.md を読んだ。Claude Code 向けのスキル (プロンプトと参照資料) で、CLI は動画を作るときだけ要る。リポジトリにもユーザーの環境にも入れず、兆候の一覧と目安の値を観点として使った
- 2026-11-10: dev サーバーで全ページ (/、/career、/skills、/works、/now、/chat、/contact、/theme) を見て、コードを兆候の語で grep した。紫のグラデーション・絵文字・大文字のラベルなどは無く、軽い段階 (Light slop) と判断した
- 2026-11-10: 持ち主が範囲を決めた。動きと文言、見出しの太さ、アクセントと影、書体は直す。既定の背景「ガラス」は残す。書体は Geist + Geist Mono
- 2026-11-10: PR #95 (トップを概要にする) がマージ済みだったので、最新の develop から `feat/unslop-design` を切った
- 2026-11-10: 手元の worktree は親リポジトリの中にあるので、pnpm が親の pnpm-workspace.yaml と lockfile を拾い、Next.js 15 で dev サーバーが落ちた。worktree に pnpm-workspace.yaml を置いて (`.git/info/exclude` 済み) 入れ直した

- 2026-11-10: 7 つの作業はどれも 1 回で合格した。波ごとに `pnpm test:unit` 全件と関係する E2E だけを流し、全体の E2E は最後の 1 回にした (持ち主の指示)
- 2026-11-11: テストの段で、E2E を 8 つの観点ぶん足した (`e2e/theme.spec.ts` に 9 本、`e2e/chat.spec.ts` に 1 本)。足したテストで、/career のカードに tokiline の既定の影 (`--toki-card-shadow` の fallback) が残っていると分かった。Tailwind の影のクラスを外すだけでは消えないので、`.toki-timeline` で `--toki-card-shadow: none` を指定した
- 2026-11-11: 最後のレビューの指摘で 3 か所を直した。ホバーのテストが transition の前に位置を読んでいたので、遷移が終わるのを待ってから読むようにした (旧 `hover:-translate-y-1` に戻すと落ちることを確かめた)。資格の囲みの検査は、同じ透明度の primary と比べるようにした (旧 `bg-primary/5` で落ちる)。ADR 0004 の決定 6 (Inter) に置き換えの追記を足し、theme.md の primary の使いどころの一覧に、チャットの吹き出し・Markdown の引用・背景テーマの選択を足した。`--font-mono` のコメントは、振る舞いを先に書き、使い道を「例えば」の括弧に入れた
- 2026-11-11: jevlint の見直し (AST だけ) で、`e2e/*.spec.ts` の `test.describe` が長くなった (theme 197 行・chat 109 行) と出た。テストファイルの長い describe は報告だけにし、分けていない

## 検証

- 2026-11-11: `pnpm lint`・`pnpm typecheck`・`pnpm test:unit` (496 件)・`pnpm build`・`pnpm test:coverage-map -- --check` は 0。`pnpm test:e2e` は 250/250 (レビューの直し後は `e2e/theme.spec.ts` 25/25 を流し直した)。書式は `prettier --check --end-of-line auto` で全ファイル合格 (手元の CRLF のため)
