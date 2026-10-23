# PBI-0032 導入演出を COMPLETE! で止め、Enter で本文へ進む

- 状態: 進行中
- 起票日: 2026-10-24
- 依頼者: リポジトリの持ち主
- 作業記録: [WORK.md](WORK.md)
- 関連 ADR: [0034](../../adr/0034-intro-and-background-handoff.md) (追記)
- 仕様: [docs/specs/intro-complete.md](../../specs/intro-complete.md) (改める仕様: [intro-handoff.md](../../specs/intro-handoff.md))

## 背景・目的

PBI-0031 で本文にすぐ入れるようになった。そのため、トップの導入演出のあとに 3D 背景へ引き継ぎ (約 1 秒)、見出しを見せ直す (0.8 秒) 段は、待ち時間を延ばすだけになった。導入演出の最後のコマを着地点にし、準備ができたら「COMPLETE!」を出す。そこから Enter で /overview へ進む形にする。見出しの文字は、隠した文字ではなく、最後のコマに見えている名前を本物の h1 にして持つ。

## やること

- 導入演出の状態の判断を作り替える (演出中・背景待ち・完了・打ち切り)。`lib/intro/handoff.ts` を `lib/intro/progress.ts` に改める
- 完了で状態の文字を LOADING から COMPLETE! に替え、一度光らせ、バーの最後の 1 割を満たす。Enter の縁の光を脈打たせる
- トップでは 3D 背景に切り替えず、導入演出の層を残す。引き継ぎと見出しの登場の処理を消す
- 最後のコマの名前と「Portfolio」を h1 にし、別に置いていた見出しを消す
- サイト内の移動で戻ったとき・視差効果を減らす設定のときは、最後の姿をいきなり出す
- 領域の名前を、完了で「読み込み中」から「読み込み完了」(英語 "Loaded") に替える
- 用語集 (CONTEXT.md)・ADR 0034・intro-handoff.md を合わせて直す

## やらないこと

- トップにいるあいだ、見えない 3D 背景の描画を止めること
- 導入演出の 5 秒の流れそのものの作り替え
- JS を切ったときに COMPLETE! を出すこと、完了を aria-live で知らせること

## 受け入れ条件

| # | 条件 | 確かめ方 |
| --- | --- | --- |
| 1 | 出来事と背景の準備完了のどの順番でも、状態が仕様どおりに決まる | test/lib/intro/progress.test.ts |
| 2 | トップを開くと「読み込み中」の領域が出て、Enter は最初から押せて /overview に移る | e2e/intro.spec.ts (@interaction) |
| 3 | 演出のあと、領域の名前が「読み込み完了」に替わり、層が残ったまま h1「Ryuki Tobita Portfolio」と Enter が見える | e2e/intro.spec.ts (@interaction) |
| 4 | 視差効果を減らす設定でも完了になる | e2e/intro.spec.ts (@a11y) |
| 5 | サイト内の移動でトップに戻ると、最初から「読み込み完了」で出る | e2e/intro.spec.ts (@navigation) |
| 6 | JS を切っても h1「Ryuki Tobita Portfolio」と Enter が見える | e2e/home.spec.ts (@content) |
| 7 | 視差効果を減らす設定では、名前の文字に動きが付かない | e2e/home.spec.ts (@a11y) |
| 8 | 英語では領域の名前が英語で出る | e2e/i18n.spec.ts (既存) |
| 9 | lint・型・書式・ユニット・ビルドが通る | `pnpm commit-gate` |
