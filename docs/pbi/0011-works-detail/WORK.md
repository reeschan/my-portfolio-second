# WORK-0011 自作の作品を /works に並べ、押すとアーキテクチャ図付きの詳細ダイアログを出す

PBI: [PBI.md](PBI.md)

## 計画

- [x] `Markdown` と `MermaidDiagram` を `components/common/` に移す — /now の E2E が通る
- [x] 6 作品のアーキテクチャ図 (ライト / ダーク) を各リポジトリから `public/works/<id>/` に写す — SVG が外部 URL を持たない
- [x] `data/works.ts` を新しい形にし、6 作品の説明を書く — test/data/works.test.ts が通る
- [x] 詳細ダイアログを汎用にし、カード・一覧を新しいデータに合わせる — /works の E2E が通る

## ADR が要る判断

- 作品の詳細の持ち方と図の置き場所、Markdown の部品の移動: [ADR 0024](../../adr/0024-works-detail-data-and-diagrams.md)

## 記録

- 2026-10-13: 起票。載せる作品と、非公開リポジトリは「非公開」と書くこと、図は D2 のロゴ入り SVG にすることを持ち主と決めた
- 2026-10-13: management-self-pieces の図は、手元のリポジトリにはあるが GitHub にはまだ push されていなかった。手元のコミット済みのファイルから写す
- 2026-10-13: 全作品に詳細を付けるので、「詳細のない作品は押せない」の E2E は対象が無くなる。`hasDetail` をやめ、このテストは消す
- 2026-10-13: Markdown と MermaidDiagram を common に移した。振る舞いは変えず、TextLink は循環を避けるため同じフォルダから直接 import する
- 2026-10-13: 6 作品の図をライト / ダークの 12 ファイルとして `public/works/<id>/` に写した。どれも取得元とバイト単位で同じで、外部の画像・フォントを読み込まない
- 2026-10-13 (PBI-004): `data/works.ts` を新しい型 (tech・repository・architecture・body) と 6 件にし、test/data/works.test.ts を足した。説明は各作品の README (portfolio は README.md と AGENTS.md、shared-memory と tracking-health は GitHub の README、tracking-health は package.json も) を元にし、図の代替テキストは README の `<img alt>` を使った。
- 2026-10-13 (PBI-004): 書かなかったもの: 環境変数の値・本番以外の URL・顧客名、TrackingHealth の健康の数値や目標 (README の目標の例も載せていない)、README で確かめられない誇張。手元の tracking-health の README は古い雛形なので使っていない。e2e/ の `work.image` と「プロジェクト2」の参照は触っていない (PBI-005 で直す)。
- 2026-10-13 (PBI-005): `WorkDetailDialog` を `work | null` を受ける形にし、`WorkGallery` は /now の一覧と同じく選んだ作品と開閉を分けて持つ (閉じる間も中身が消えない)。`ArchitectureDiagram` は削除。
- 2026-10-13 (PBI-005): カードは図を `object-contain` の枠に収め、ライト / ダークは `dark:` で 2 枚出し分ける (隠れた方は display: none で E2E のロールにも出ない)。E2E は全 6 件を順に開いて図・「概要」・リポジトリの行を確かめる形にした。

## 検証

```
pnpm commit-gate
```
