# WORK-0029 トップに導入演出を流し、読み込みが済んだら 3D 背景へ引き継ぐ

PBI: [PBI.md](PBI.md)

## 計画

- [x] 引き継ぎの判断 (純粋な関数) — test/lib/intro/handoff.test.ts
- [x] 背景の読み込みを手が空いてからにし、準備完了を知らせる — test/lib/background-load.test.ts、e2e/background-theme.spec.ts
- [x] 演出用の色のトークンと `glass-button` — e2e/theme.spec.ts
- [x] 導入演出の部品 — e2e/intro.spec.ts
- [x] トップへの組み込み — e2e/intro.spec.ts、e2e/home.spec.ts
- [x] ADR 0034 を書き、ADR 0012・0004 と theme.md を更新する

## ADR が要る判断

- [ADR 0034](../../adr/0034-intro-and-background-handoff.md): 導入演出・3D 背景の遅延読み込み・引き継ぎの判断、導入演出の CSS を CSS Modules に置くこと

## 記録

- 2026-10-23: 試作 (単一の HTML と確認用の mp4) で、見た目とタイミングを持ち主と合意した。絵は目を開けた絵と目を閉じた絵の 2 枚、ハートと最後の笑顔の絵は外した
- 2026-10-23: design-flow の grilling で仕様 (docs/specs/intro-handoff.md) を合意した。用語は CONTEXT.md の「背景とトップ」に足した
- 2026-10-23: 導入演出のアニメーション (破片の形・光の帯・マスク) は Tailwind のクラスで書きにくく、globals.css に入れると全ページで読まれるので、部品の隣の CSS Modules に置く。色はトークンから取る
- 2026-10-23: 導入演出の部品のレビューで、色の玉の配置崩れ・最初のコマでカードの中のキャラクターが透明になること (LCP)・引き継ぎのときの瞬きのちらつき・修飾キー付きのクリックでも打ち切ることを直した。カードのガラスの見た目は疑似要素に分け、キャラクターの祖先の透明度を 0 から始めない
- 2026-10-23: 演出の終わりを時計の animationend だけで受けると、ハイドレーションより前に時計が終わったとき (視差効果を減らす設定の 1 秒など) に取りこぼし、演出が止まったままになった。付いたときに `getAnimations()` の `finished` も待ち、1 回だけ処理する

## 検証

```
pnpm commit-gate
```
