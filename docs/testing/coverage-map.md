<!-- このファイルは scripts/e2e-coverage.mjs が生成する。手で編集しない (pnpm test:coverage-map -- --write) -->
# テストカバレッジ表 (ルート × 観点)

観点の定義は [testing/e2e-policy.yml](../../testing/e2e-policy.yml)。数字はその観点のテスト数、`—` は対象外、`❌` は穴。

| ルート | 種別 | smoke | navigation | interaction | chat | external-mock | api-contract | privacy | a11y | responsive | content | theme | llm-eval |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | page | 1 | 1 | 1 | — | — | — | — | 1 | 2 | 1 | 1 | — |
| `/career` | page | 1 | 3 | 3 | — | — | — | — | 1 | 4 | 2 | 1 | — |
| `/chat` | page | 1 | 4 | 1 | 11 | 10 | — | — | 1 | 4 | 1 | 1 | — |
| `/now` | page | 1 | 3 | 4 | — | — | — | — | 1 | 4 | 4 | 1 | — |
| `/overview` | page | 1 | 8 | 2 | — | — | — | — | 1 | 4 | 1 | 2 | — |
| `/skills` | page | 1 | 3 | 4 | — | — | — | — | 1 | 4 | 2 | 1 | — |
| `/theme` | page | 7 | 4 | 4 | — | — | — | — | 1 | 4 | 1 | 2 | — |
| `/works` | page | 1 | 3 | 4 | — | — | — | — | 1 | 4 | 1 | 1 | — |
| `/api/chat` | api | — | — | — | — | 5 | 9 | 3 | — | — | — | — | 1 |
| `/api/now` | api | — | — | — | — | — | 8 | — | — | — | — | — | — |
| `/api/now/[id]` | api | — | — | — | — | — | 5 | — | — | — | — | — | — |
| `/rss.xml` | api | — | — | — | — | — | 1 | — | — | — | — | — | — |

## 穴

なし

## 無効にしている観点

- visual-regression: 3D 背景とアニメーションで画面が毎回変わり、スクリーンショット比較が不安定になるため。採用するなら ADR を書く
- performance: 個人サイトで現状は不要。Lighthouse CI などを入れるなら ADR を書く
