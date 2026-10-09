# 0014. 書式とリポジトリの自動化: Prettier・Dependabot・CodeQL・CI の共通化

- 状態: 採用
- 日付: 2026-10-09
- 関連: [PBI-0003](../pbi/0003-code-quality-gates/PBI.md)、[ADR 0007](0007-ci-quality-gate.md)

## 背景

- フォーマッタがなく、ファイルによってセミコロンの有無や折り返しが揃っていなかった (`types/skill-types.ts`、`components/features/skills/skill-radar.tsx` など)
- 依存の更新は手作業で、まとめて上げるたびに大きな PR になっていた
- セキュリティの静的解析がなかった
- CI の 5 ジョブが同じ準備 (pnpm・Node・install) を繰り返し書いていて、アクションはタグ (`@v4`) 参照だった

## 決定

1. **Prettier** を入れる。設定は今のコードの多数派に合わせる (セミコロンなし・ダブルクォート・末尾カンマあり・1 行 140 字)。対象はコードと CSS (`ts` `tsx` `mts` `mjs` `css`)。Markdown は表や改行の意図を崩しやすいので対象外
   - ESLint とは `eslint-config-prettier` で書式ルールの食い違いをなくす
   - CI の lint ジョブで `pnpm format:check` を実行し、揃っていない変更を止める
2. **Dependabot** で npm と GitHub Actions の更新 PR を毎週月曜に出す。npm のパッチ・マイナーは 1 本にまとめ、メジャーは個別。ESLint のメジャーは上げない (AGENTS.md)
3. **CodeQL** で `javascript-typescript` と `actions` を解析する (PR・main への push・週 1 回)。`ci-ok` の必須チェックには入れない
4. CI の共通の準備を `.github/actions/setup` (composite action) にまとめ、外部のアクションは **コミット SHA で固定** する (タグの付け替えによる差し替えを防ぐ。更新は Dependabot が行う)

## 検討した選択肢

| 選択肢 | 良い点 | 悪い点 |
| --- | --- | --- |
| Prettier (採用) | 定番で、エディタ連携が揃っている。ESLint と役割を分けられる | 道具が 1 つ増える |
| Biome | 速く、lint と書式を 1 つにできる | Next.js の ESLint 設定 (Core Web Vitals) を置き換えられない |
| Renovate | 設定が柔軟 | 外部の GitHub App が要る。今の規模なら Dependabot で足りる |
| CodeQL を ci-ok の必須にする | 見落としがなくなる | 誤検知でマージが止まる。まず結果を見てから決める |

## 結果

- 書式は機械が決めるので、レビューで書式を指摘しなくてよい。初回の整形は 1 コミット (`style:`) にまとめた
- 依存更新の PR が定期的に来る。CI (`ci-ok`) が緑ならマージしてよい
- CodeQL の結果は Security タブに出る
- アクションの SHA は Dependabot が更新するので、手で書き換えなくてよい
