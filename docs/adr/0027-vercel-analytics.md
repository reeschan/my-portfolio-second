# 0027. 閲覧の計測は Vercel Web Analytics で行い、Vercel 上でだけ動かす

- 状態: 提案中
- 日付: 2026-10-13
- 関連: [PBI-0017](../pbi/0017-vercel-analytics/PBI.md)

## 背景

- ポートフォリオがどれくらい見られているか、どのページが読まれているかを知る手段が無い
- サイトは Vercel にデプロイしている。Vercel Web Analytics は Cookie を使わず、Hobby プランでも月 5 万イベントまで使える
- `@vercel/analytics` の `<Analytics />` は、Vercel 以外の本番ビルドでは `/_vercel/insights/script.js` を読みに行って 404 になり、dev では外部の `va.vercel-scripts.com` からデバッグ用スクリプトを読む。E2E は console エラーを自動で検出し (e2e/fixtures.ts)、テストから外部に出ない方針 (testing/e2e-policy.yml) なので、そのままでは E2E に影響する

## 決定

- `@vercel/analytics` を使い、`app/layout.tsx` に `@vercel/analytics/next` の `<Analytics />` を置く。全ページのページビューを計測する
- Vercel が実行時に入れる `VERCEL=1` があるときだけ描く。判定は `lib/analytics.ts` の `isVercelAnalyticsEnabled` に置く
- 計測を有効にするのは Vercel のダッシュボード (Project → Analytics → Enable) で持ち主が行う

## 検討した選択肢

| 選択肢 | 良い点 | 悪い点 |
| --- | --- | --- |
| **Vercel Web Analytics (採用)** | デプロイ先と一体で設定が少ない。Cookie を使わず同意バナーが要らない | Vercel 以外では動かない。無料枠を超えると止まる |
| Google Analytics | 機能が多く無料 | Cookie を使い、外部スクリプトが重い。同意の扱いが要る |
| 計測しない | 依存が無い | 見られ方が分からないまま |

| 描く条件 | 良い点 | 悪い点 |
| --- | --- | --- |
| **`VERCEL=1` のときだけ (採用)** | 手元と CI でスクリプトを読まず、E2E が外部に出ない | Vercel 上での振る舞いは E2E では確かめられない |
| いつも描く | コードが 1 行で済む | CI の本番ビルドで 404 の console エラーが出る。dev で外部のスクリプトを読む |
| `mode` で dev を止める | 公式の設定だけで済む | CI の本番ビルド (production 扱い) の 404 は防げない |

## 結果

- Vercel のダッシュボードでページごとのビュー・訪問者数・参照元が見られる
- 手元と CI では計測スクリプトを読まないことを e2e/smoke.spec.ts で確かめる
- Vercel 上で計測できているかは、デプロイ後に持ち主がダッシュボードで確かめる
