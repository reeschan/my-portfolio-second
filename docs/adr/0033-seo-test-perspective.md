# 0033. テスト観点 seo を新しく作り、app の全ページで必須にする

- 状態: 提案中
- 日付: 2026-10-21
- 関連: [0029](0029-site-url-and-seo-metadata.md) (「結果」の「新しい観点は足さない」を置き換える)、PBI-0028、[docs/specs/seo-stage2.md](../specs/seo-stage2.md)

## 背景

1 段目の SEO (ADR 0029) では、新しい観点は足さず、トップの metadata・OGP の画像・robots・sitemap を @smoke と @api-contract で確かめた。2 段目 (PBI-0028) では、外部の監査道具 jev-seo の検査の考え方を借りて、全ページの title・canonical・自サイトの URL のホスト・h1・見出しの段・構造化データ・noindex・404・セキュリティヘッダーを確かめたい。

これをページごとの既存の観点に散らすと、ページを足したときに SEO の検査が漏れても気付けない。jev-seo そのものは本番の URL にしか当てられず、所見があっても終了コードを変えないので、CI のゲートにはならない。

## 決定

- `testing/e2e-policy.yml` に観点 `seo` を足し、`applies_to: pages`・`required: true` にする。トップ (/) と /now/[id] を含む app の全ページが対象になり、ページを足すと自動で必須になる
- 確かめること: title が辞書の期待値と一致する、canonical が自分の正のホストの URL を指す、自サイトの絶対 URL がすべて正のホストで始まる、h1 が 1 つ、見出しが段を飛ばさない、構造化データの型、道具のページの noindex、404、セキュリティヘッダー
- E2E は機能ごとのファイル (`e2e/seo-*.spec.ts` など) に分け、metadata・構造化データ・見出しはページを開いたあとの DOM で見る
- 辞書で決まる検査 (description の長さ、title の重なり) は Vitest に置き、develop 宛ての PR の CI でも止める
- 既存の SEO の E2E (@smoke・@api-contract) はそのまま残す
- jev-seo は CI では回さない。持ち主が本番に出たあとに手元で当てる (手順は `docs/agents/seo-audit.md`)

## 検討した選択肢

| 選択肢 | 良い点 | 悪い点 |
| --- | --- | --- |
| A: 観点 seo を新しく作り、全ページで必須 (採用) | ページを足しても検査が漏れない。カバレッジ表で SEO の穴が見える | 観点を足すコミットで、全ページに @seo のテストを 1 本ずつ入れる必要がある |
| B: 既存の @smoke・@api-contract に検査を足す | 観点の数が増えない | smoke の意味 (表示とエラー) がぼやける。SEO の穴が表に出ない |
| C: jev-seo を CI で回す | 検査を自前で書かなくてよい | localhost を拒み、終了コードでゲートにならない。外部 LLM (Jev) を CI から呼ぶことになる (AGENTS.md の決まりに反する) |

## 結果

- SEO の基本が崩れると、手元の `pnpm commit-gate` と develop へのマージ後の E2E で止まる。develop 宛ての PR の CI では E2E を回さないので、PR で止めたい検査は Vitest に寄せる
- 観点の穴は `pnpm test:coverage-map -- --check` で見える
- ADR 0029 の「新しい観点は足さない」はこの ADR で置き換える
