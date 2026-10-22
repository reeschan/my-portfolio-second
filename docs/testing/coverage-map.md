<!-- このファイルは scripts/e2e-coverage.mjs が生成する。手で編集しない (pnpm test:coverage-map -- --write) -->
# テストカバレッジ表 (ルート × 観点)

観点の定義は [testing/e2e-policy.yml](../../testing/e2e-policy.yml)。数字はその観点のテスト数、`—` は対象外、`❌` は穴。

| ルート | 種別 | smoke | navigation | interaction | chat | external-mock | api-contract | privacy | a11y | responsive | content | seo | theme | llm-eval |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | page | 4 | 1 | 1 | — | — | — | — | 2 | 4 | 2 | 9 | 1 | — |
| `/career` | page | 3 | 5 | 4 | — | — | — | — | 1 | 5 | 6 | 4 | 1 | — |
| `/chat` | page | 2 | 4 | 1 | 11 | 10 | — | — | 1 | 4 | 3 | 4 | 1 | — |
| `/contact` | page | 2 | 2 | 5 | — | 4 | — | — | 1 | 3 | 3 | 4 | 1 | — |
| `/now` | page | 2 | 3 | 6 | — | — | — | — | 1 | 5 | 6 | 4 | 1 | — |
| `/now/[id]` | page | 4 | ❌ | 8 | — | — | — | — | 1 | 2 | 3 | 4 | ❌ | — |
| `/overview` | page | 5 | 11 | 5 | — | — | — | — | 1 | 8 | 7 | 7 | 2 | — |
| `/skills` | page | 2 | 3 | 4 | — | — | — | — | 1 | 4 | 5 | 4 | 1 | — |
| `/theme` | page | 8 | 4 | 5 | — | — | — | — | 1 | 4 | 3 | 4 | 2 | — |
| `/works` | page | 2 | 3 | 5 | — | — | — | — | 1 | 5 | 5 | 4 | 1 | — |
| `/api/chat` | api | — | — | — | — | 5 | 9 | 3 | — | — | — | — | — | 1 |
| `/api/contact` | api | — | — | — | — | 1 | 2 | — | — | — | — | — | — | — |
| `/api/now` | api | — | — | — | — | — | 13 | — | — | — | — | — | — | — |
| `/api/now/[id]` | api | — | — | — | — | — | 6 | — | — | — | — | — | — | — |
| `/rss.xml` | api | — | — | — | — | — | 3 | — | — | — | — | — | — | — |

## 穴

- `/now/[id]` × navigation
- `/now/[id]` × theme

## 無効にしている観点

- visual-regression: 3D 背景とアニメーションで画面が毎回変わり、スクリーンショット比較が不安定になるため。採用するなら ADR を書く
- performance: 個人サイトで現状は不要。Lighthouse CI などを入れるなら ADR を書く
