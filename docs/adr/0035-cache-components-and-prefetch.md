# 0035. ページは言語に依らない殻と言語ごとの中身に分け、Cache Components と先読みですぐ切り替える

- 状態: 提案中
- 日付: 2026-10-23
- 関連: ADR 0026 (言語は Cookie)、0029 (metadata)、0030 (/now の記事のページ)、0034 (導入演出)、PBI-0031、[docs/specs/glass-theme-and-navigation.md](../specs/glass-theme-and-navigation.md) (後半)

## 背景

タブを押してから中身が替わるまでの待ちが長い。ルートのレイアウトが Cookie で表示言語を読む (ADR 0026) ので全ページがリクエストごとの描画 (ビルドの表で ƒ) になり、読み込み中の表示も先読みもないため、押してもサーバーが描き終わるまで何も起きない。/now は移るたびに外部のデータベース (Upstash) を往復する。

変更前の計測 (2026-10-23、`docs/pbi/0031-navigation-perf/WORK.md`): 本番でタブを押してから見出しが替わるまで、初回の中央値 265ms・/now は 444ms。

Next.js 16.4 の Cache Components と Partial Prefetching を使うと、ビルド時に作った殻をすぐ出し、Cookie に依る中身は先読みで手元に持っておける。ただし Cookie を `<Suspense>` の外で読むとルート全体が殻を持てなくなる。

## 決定

- `next.config.ts` で `cacheComponents: true` と `partialPrefetching: true` を有効にする。Cache Components と両立しない `export const runtime` は API から外す
- **表示言語は今までどおり Cookie で持つ** (ADR 0026 を維持)。URL も変えない
- **ルートのレイアウトは Cookie を読まない**。`<html lang="ja">` を既定で出し、`<head>` のインラインのスクリプトが描く前に Cookie の言語で `lang` を書き換える (Next.js の「ハイドレーション前のちらつきを防ぐ」形)。言語を切り替えたときは、言語の中身の側の小さなクライアントの部品が `lang` を合わせる
- **ページは殻と中身に分ける**
  - 殻: ルートのレイアウト、3D 背景、タブバーとアドレスバーの場所 (空のガラスの帯)、本文のパネルの枠、トップの見出しと入口
  - 中身: 表示言語で描くもの。`<Suspense>` の中で Cookie から言語を読み、言語を引数にした `"use cache"` の部品で描く。先読みのページの殻 (App Shell) に入るよう `cacheLife` の `stale` を 5 分以上にする (`data/` の固定の中身は `max`)
- **タブ付きのページはルートグループ `app/(tabs)/` に置き、タブバーとアドレスバーは共通のレイアウト (`components/layout/site-frame.tsx`) が持つ**。サイト内の移動ではタブバーを描き直さない。URL は変わらない
  - 共通のレイアウトの `<Suspense>` の中で言語を読み、`LocaleProvider` で配る (ルートのレイアウトからは外す)
  - 本文のパネルの位置に、読み込み中の枠 (`aria-busy`) を `loading.tsx` で置く
- /now の記事は `"use cache"` と `cacheTag` で作り置きし、投稿・更新・削除の API の成功時に `revalidateTag` で作り直す。`connection()` と `no-store` は外す。保存先の失敗は作り置きしない (投げて、ページが文言を出す)
- **旧リンクの `/now?post=<id>` の 308 と、知らない id の記事 (`/now/<id>`) の 404 は、ページの中ではなく `proxy.ts` (対象は `/now` と `/now/:id` だけ) で返す**。Partial Prefetching では、`generateStaticParams` の無い動的ルートはビルドで作る「params が未確定の殻」を先に 200 で返すので、ページの中の `permanentRedirect()`・`notFound()` では状態コードを変えられない (本番ビルドで 200 になった。開発サーバーでは 404・308 になるので気付きにくい)。`instant = false`・`connection()`・`generateStaticParams` ではどれも直らなかった
  - 記事のページの要求ごとに、proxy が保存先 (Upstash) を 1 回読んで記事の有無を確かめる。proxy は別のバンドルで `"use cache"` の作り置きと共有できないため。保存先が落ちているときは通す (本物の記事まで 404 にしない)
  - `next.config.ts` の `redirects` は元のクエリを転送先に付けたまま (`/now/<id>?post=<id>`) にするので使わない
- /now の記事のページ (`app/now/[id]`) はルートグループに入れず、ページ自身が共通の枠 (`SiteFrame`) で包む。記事の読み込みは作り置きなので、ページを描くときの外部の往復は増えない。404 のページも同じ枠を使う
- グラフ (recharts) と Markdown (react-markdown) は `next/dynamic` で使うときに読み込む
- `generateMetadata` も言語を引数にした `"use cache"` で描く。クローラーへの返し方は Next.js の既定 (`htmlLimitedBots` の一覧は metadata を待って `<head>` に入れる) に任せる

## 検討した選択肢

| 選択肢 | 良い点 | 悪い点 |
| --- | --- | --- |
| Cache Components と先読み (採用) | URL もページの置き場所も変えずに、殻はビルド時に作られ、中身は先読みで手元に届く。Next.js の次のメジャーで既定になる形 | 直接開いたときの HTML に言語の中身は入らない (殻のあとに流れてくる)。Cookie を読む場所を `<Suspense>` の中に閉じ込める決まりが増える |
| proxy で言語ごとの静的なページに振り分ける (`app/[locale]/` + Cookie で rewrite) | 言語ごとに全部入りの静的な HTML を配れる | 全ページの移動と、proxy・rewrite と `usePathname` の食い違いへの手当てが要る。言語の切り替えでページを丸ごと取り直す |
| URL で言語を分ける (`/en/...`) | 英語版が検索に載る | ADR 0026 で見送った理由 (差分の大きさ、リンクと E2E の書き換え) が今も同じ |
| 読み込み中の表示と先読みだけ足す (`loading.tsx` + `prefetch`) | 変更が小さい | 全ページが ƒ のままで、先読みは読み込み中の枠までしか届かない。押した後は今と同じだけ待つ |
| (記事の 404) `partialPrefetching: false` + `generateStaticParams` | proxy が要らない | サイト全体の先読みが従来のリンクごとの方式に戻る。共通の枠をレイアウトに置く形とも両立しない (200 に戻る) |
| (記事の 404) 何もしない (noindex 付きの 200 を許す) | 変更が無い | 状態コードを見る検索エンジン・監視・E2E には 404 に見えない (soft 404) |

## 結果

- タブを押した瞬間に中身が替わる (先読み済みのとき)。先読みが済んでいないときは、本文のパネルの位置に読み込み中の枠がすぐ出る
- ビルドの表で、タブ付きのページは部分的に作り置き (◐) になる。/now の記事のページと 404 は ƒ のまま
- JS を切った閲覧者に見えるのはトップの見出しと入口まで。ほかのページの本文は JS がないと出ない (仕様の Out of Scope)。リンクのプレビューのクローラー (htmlLimitedBots) には、Next.js が全部描いてから返す
- `"use cache"` の既定の置き場所はインスタンスのメモリなので、Vercel では投稿の反映がインスタンスごとにずれうる。/now の作り置きは `revalidate` を短く (5 分) して上限を決める。持ち主が Vercel のプレビューで確かめる
- 開発中は、殻にできていない箇所を開発用の画面が指摘する。指摘が出ないことを PBI-0031 の完了の条件にする
- 性能の自動テストは足さない (`testing/e2e-policy.yml` の performance)。変える前と後を同じ手順 (タブを押してから見出しが替わるまで) で測って WORK に残す
