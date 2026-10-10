# WORK-0007 README にロゴ入りのアーキテクチャ図を載せる

PBI: [PBI.md](PBI.md)

## 計画

- [x] 作図ツールを決めて ADR に残す — [ADR 0020](../../adr/0020-readme-architecture-diagram-d2.md) がある
- [x] `docs/architecture/architecture.d2` を書き、ライト用・ダーク用の SVG を描く — 両方の PNG を目で確かめる
- [x] README の「アーキテクチャ」節の先頭に `<picture>` で埋め込み、Mermaid の図を「詳細」にする — README の差分
- [x] README の冒頭に技術スタックのアイコン列 (skillicons.dev) を置く — 指定した ID がすべて実在する
- [x] 描き直し方を `docs/architecture/README.md` に書く — その手順で描き直して差分が出ない
- [ ] PR の Files changed で、README の図をライト・ダーク両方で確かめる (受け入れ条件 2)

## ADR が要る判断

- 作図ツールの採用 (D2) と、生成物の SVG をコミットする方針 → [ADR 0020](../../adr/0020-readme-architecture-diagram-d2.md)

## 記録

- 2026-10-10: 番号は PBI 0007・ADR 0020 にした。別の作業ツリー (`claude/chat-docs-redis`) が未 push の PBI 0006・ADR 0019 を使っているため
- 2026-10-10: Python の `diagrams` も検討したが、構成が AWS ではなく Vercel / Upstash / Moonshot / Slack で、アイコンがほとんど無いため D2 にした (ADR 0020)
- 2026-10-10: Slack のロゴは Simple Icons から削除されていたので、Terrastruct の `dev/slack.svg` を使った
- 2026-10-10: AI チャット画面のアイコンは、魔法の杖 (`essentials/078-magic wand`) がダーク用で背景に溶けて見えなかったため、電球 (`essentials/111-idea`) にした
- 2026-10-10: 線の交差 (「投稿を通知」の破線が「記事を読む」の線をまたぐ) が 1 か所残る。ELK はノードの宣言順を配置に使わず、並べ替えても変わらなかった。dagre も試したが曲線が絡んでかえって読みにくかったので、ELK のまま受け入れた
- 2026-10-10: skillicons.dev の `playwright` は存在しない ID (空の画像が返る) だったので外した
- 2026-10-10: `/rss.xml` と `/api/now` の PUT / DELETE は全体像の図には描かず、Mermaid の詳細図と README の表に任せた

## 検証

受け入れ条件 3 (中身の突き合わせ): README の Mermaid 図・AGENTS.md の構成と比べ、ページ (各ページ・/chat)、API (`/api/chat`・`/api/now`)、サーバー側の `resume.md`、外部サービス (Moonshot・Upstash Redis・Slack) と、その間の流れが一致することを確かめた。

```
$ grep -c 'href="http' docs/architecture/*.svg
docs/architecture/architecture-dark.svg:0
docs/architecture/architecture-light.svg:0

# docs/architecture/README.md の手順 (d2 v0.9.0) で描き直して比べた
$ cmp <描き直した light> docs/architecture/architecture-light.svg   # 一致
$ cmp <描き直した dark>  docs/architecture/architecture-dark.svg    # 一致
```

docs と README だけの変更なので、`scripts/commit-gate.mjs` の決まりによりコミットゲートの検査の対象外 (`isDocsOnly`)。
