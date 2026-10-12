# WORK-0013 概要ページに自己紹介・外部リンク・各ページの案内を載せ、経歴の参画先を整える

PBI: [PBI.md](PBI.md)

## 計画

- [x] `data/overview.ts` に自己紹介・外部リンク・各ページの案内を書き、/overview で描く — e2e/content.spec.ts が通る
- [x] 案内とタブの対応をユニットで確かめる — test/data/overview.test.ts が通る
- [x] 経歴を STRACT と Other にする — e2e/interaction.spec.ts が通る
- [x] タブを名前で探す E2E を `ページ切り替え` のナビゲーションに絞る — e2e/navigation.spec.ts と e2e/smoke.spec.ts が通る
- [ ] LinkedIn の URL を持ち主から受け取って足す

## ADR が要る判断

- なし (既存の data/ と common の部品の使い方に沿う)

## 記録

- 2026-10-12: 起票。肩書きは持ち主の言葉どおり「フルスタックデベロッパー」。GitHub は https://github.com/reeschan
- 2026-10-12: LinkedIn の URL はリポジトリに無いので推測せず、持ち主に確認中。届くまで GitHub だけを出す
- 2026-10-12: タブの表示名は `lib/navigation.ts` が正なので、案内のデータには href と説明だけを持たせ、名前はページで引く
- 2026-10-12: 本文に「経歴」などのリンクが増え、`getByRole("link", { name: "経歴" })` が 2 つに当たるようになる。既存の E2E はタブを押す意図なので、`ページ切り替え` のナビゲーションの中に絞った
- 2026-10-12: 経歴のダイアログの E2E は参画先の名前を直書きせず、data/career.ts から読む形にした (content 観点の決まりに合わせる)

## 検証

```
pnpm commit-gate
```
