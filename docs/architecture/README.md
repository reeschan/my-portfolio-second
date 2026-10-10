# アーキテクチャ図

README の先頭にある全体像の図のソースと生成物。決めごとは [ADR 0020](../adr/0020-readme-architecture-diagram-d2.md)。

| ファイル | 中身 |
| --- | --- |
| `architecture.d2` | ソース。ロゴの URL と、単色ロゴの色 `__MONO__` を書く |
| `architecture-light.svg` | GitHub のライトテーマ用 (d2 テーマ 0、単色ロゴは黒) |
| `architecture-dark.svg` | GitHub のダークテーマ用 (d2 テーマ 200、単色ロゴは白) |

SVG は生成物だが、GitHub は `.d2` を描けないのでコミットする。**構成 (ページ・API・外部サービス) を変えたら `.d2` を直して描き直し、SVG も同じ PR に入れる。**

## 描き直す

[d2](https://d2lang.com/tour/install) を入れて、ライト用とダーク用を描く。

```bash
sed 's/__MONO__/000000/g' docs/architecture/architecture.d2 > /tmp/arch-light.d2
sed 's/__MONO__/ffffff/g' docs/architecture/architecture.d2 > /tmp/arch-dark.d2
d2 --theme=0   /tmp/arch-light.d2 docs/architecture/architecture-light.svg
d2 --theme=200 /tmp/arch-dark.d2  docs/architecture/architecture-dark.svg
```

- ロゴは描くときに取得され、SVG に data URI で埋め込まれる。取得できない URL があると d2 は失敗する
- 描いたあと、外部 URL が残っていないことを確かめる (GitHub の `<img>` は SVG 内の外部 URL を読まない)

```bash
grep -c 'href="http' docs/architecture/*.svg   # すべて 0 であること
```

## 書き方の約束

- 全体像だけを描く。ノードは 15 個前後まで。処理の順番やファイル名は README の Mermaid 図に書く
- ロゴは [Simple Icons](https://simpleicons.org) (`https://cdn.simpleicons.org/<slug>`) を優先し、無いもの (Slack など) は [Terrastruct のアイコン](https://icons.terrastruct.com) を使う
- 黒や濃い灰色のロゴは色を `__MONO__` にする (付けないとダーク用で見えない)
- 本流の流れは実線、通知のような付け足しの流れは破線 (`style.stroke-dash: 4`)
