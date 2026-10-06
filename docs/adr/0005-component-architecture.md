# 0005. コンポーネントの構成: ui / common / layout / features と data に分ける

- 状態: 採用
- 日付: 2026-10-06
- 関連: PBI-0001、0003、0004、[docs/design/components.md](../design/components.md)

## 背景

`components/` の直下に、汎用の部品 (RSS ボタン)、ページの枠 (PageTemplate)、ページ専用の大きな部品 (経歴のタイムライン、データ込みで 200 行超) が混ざっていた。
経歴やスキルのデータは部品の中に直書きされ、作品の一覧はページに直書きされていた。カードを押せる要素が `div` の `onClick` で、キーボードで操作できなかった。

## 決定

部品を 4 つの層に分け、表示するデータは `data/` に出す。

| 層 | 置き場所 | 中身 | 依存してよいもの |
| --- | --- | --- | --- |
| ui | `components/ui/` | shadcn/ui の基本部品 (Button, Dialog, Tabs, Badge …)。見た目の種類は cva の variant | なし (lib/utils だけ) |
| common | `components/common/` | 画面をまたいで使う部品 (GlassPanel, Section, Callout, TagList, BulletList, TextLink)。`index.ts` から import する | ui |
| layout | `components/layout/` | 全ページ共通の枠 (PageTemplate, BrowserTabs, AnnouncementBanner, RssButton, ThemeProvider) | ui, common, lib |
| features | `components/features/<機能>/` | 1 つのページ・機能に閉じた部品 (career, skills, works, chat, background) | ui, common, data, lib, hooks |

- **ページ (`app/**/page.tsx`) は組み立てだけ**にする: PageTemplate + features / common の部品
- **表示データは `data/*.ts`** に置く (career, skills, works, now)。文言の更新はデータファイルだけで済むようにする
- ナビゲーションのタブは `lib/navigation.ts` が正本 (並び順もここで決まる)
- 押せるものは `button` / `a` にする。カード全体を押せるようにするときは、見出しの中のボタンを擬似要素でカード全体に広げる (WorkCard)
- features の部品同士は import しない。共有したくなったら common に上げる

## 検討した選択肢

| 選択肢 | 良い点 | 悪い点 |
| --- | --- | --- |
| 層で分ける + data/ に出す (採用) | 依存の向きが決まり、エージェントが置き場所に迷わない。データの更新が安全 | ファイル数が増える |
| Atomic Design (atoms / molecules / organisms …) | 有名で説明しやすい | 小さなサイトには層が多すぎ、どこに置くかの議論が増える |
| ページごとのフォルダに全部置く (colocation) | ページを消すときに楽 | 共通部品の置き場所がなくなる |

## 結果

- 層の決まりは docs/design/components.md に一覧で載せ、新しい部品はそこに足す
- データを E2E から直接読んで「漏れなく表示されているか」を確かめられる (`e2e/content.spec.ts`)
- 構成を変えたときは、既存の E2E がロール (`getByRole`) で要素を取っているので壊れにくい。今回の移動でも既存のテストは変えずに通った
