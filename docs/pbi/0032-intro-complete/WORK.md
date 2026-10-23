# WORK-0032 導入演出を COMPLETE! で止め、Enter で本文へ進む

PBI: [PBI.md](PBI.md)

## 計画

- [x] 状態の判断の純粋関数 (`lib/intro/progress.ts`) — test/lib/intro/progress.test.ts
- [x] 導入演出の部品 (h1・状態の文字・完了の見せ方・Enter の脈打ち・領域の名前の切り替え) — e2e/intro.spec.ts
- [x] トップのページ (見出しの要素を消す、言語の島に「読み込み完了」を足す) — e2e/home.spec.ts、e2e/i18n.spec.ts
- [x] 画面の文言 (`intro.complete`) — 型チェック (ja と en が同じ型)
- [x] 文書 (仕様・ADR 0034 の追記・CONTEXT.md・intro-handoff.md の注記) — 目で見る
- [x] `pnpm commit-gate`

## ADR が要る判断

- [ADR 0034](../../adr/0034-intro-and-background-handoff.md) に追記 (引き継ぎをやめて完了で止める)

## 記録

- 2026-10-24: design-flow の grilling で仕様 ([docs/specs/intro-complete.md](../../specs/intro-complete.md)) を持ち主と合意した。完了のあとの背景は「3D 背景に切り替えず、最後のコマのまま止める」(案 b) を選んだ。用語集の「引き継ぎ」を外し、「導入演出の完了」を足した
- 2026-10-24: Cache Components では、Enter で /overview に移ったあと「戻る」でトップに戻ると、導入演出の部品が作り直されず、打ち切りの状態のまま見せ直される (React の Activity。`node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md`)。CSS のアニメーションは display: none から戻ると頭から流れ直す。そこで、打ち切りも完了の姿にし、演出を止める (`still`) ことにした。止め方は、どのアニメーションも `animation-delay: -60s` で終わった姿から描く (どれも有限の長さで both で止まるため)。仕様と ADR 0034 の追記に書き足した
- 2026-10-24: 名前を 1 文字ずつの span のまま h1 にすると、見出しの名前が「R y u k i T o b i t a Portfolio」と 1 文字ずつ切れた (E2E の aria スナップショットで確認)。名前の行が flex で、子が別々の塊になるため。inline-block でも同じく切れたので、span を inline にし、浮かぶ動きを transform から `position: relative` の `top` に替えた (inline の要素には transform が効かない)
- 2026-10-24: flex で並べていたときは、名前の行の text-indent (0.32em) が各文字に引き継がれ、字と字のあいだが 0.66em 空いていた。inline に替えると字間が詰まったので、letter-spacing と text-indent を 0.66em にして元の見た目にそろえた
- 2026-10-24: 状態の文字の行 (LOADING / COMPLETE!) を足したら、1440×900 でも Enter と重なった (元からバーは Enter の 6px 上にあった)。見出しの行の高さを 1.25 に詰め、カードと文字のあいだを 52px → 40px、カードの幅の上限を 44vh → 36vh (縦 720px 以下は 38vh → 35vh、560px 以下は 32vh → 25vh)、上への寄せを強めた。1920×1080・1440×900・1366×768・1280×720・1024×740・800×600・375×812・375×667・375×560・740×400・667×375 で、状態の文字と Enter が重ならないことを測った (余白 7〜105px)
- 2026-10-24: COMPLETE! は 11px だと目立たないので、状態の文字を 12px、COMPLETE! を太字にした
- 2026-10-24: 1 回目の commit-gate で、e2e/content.spec.ts の「トップ: 名前と Portfolio の見出しが出る」が落ちた。名前の空白を改行しない空白 (U+00A0) で置いていたので、見出しの文字 (textContent) が「Ryuki Tobita」と一致しなかった。文字を inline で並べるようにしたので改行しない空白は要らず、ふつうの空白に戻した
- 2026-10-24: 途中で持ち主から「タブの切り替えのちらつきが気になる」と指摘があった。PBI-0031 の範囲なので、別のセッションで扱う (この PBI には入れない)

## 検証

最後に実行したコマンドと結果。

```
E2E_PORT=3317 pnpm commit-gate
lint / 型チェック / ユニット / 必須観点の穴: 合格
E2E: 238 passed (1.5m)
commit-gate: 合格
```

- E2E のポートを 3317 にしたのは、ほかのセッションの開発サーバー (既定の 3100) を使い回さないため
- 途中で、関係する spec (e2e/intro.spec.ts・e2e/home.spec.ts・e2e/i18n.spec.ts) を開発サーバーに向けて流し、通ることを確かめた
- 目で見た確認: 1440×900 とスマートフォン (375×812) で完了の姿、Enter で本文に入ってから戻ったときに最後の姿がいきなり出て、動いているのは Enter の光だけであること
