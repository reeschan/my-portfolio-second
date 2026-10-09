import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"
import tseslint from "typescript-eslint"
import prettier from "eslint-config-prettier/flat"

// Next.js 推奨 (Core Web Vitals) + TypeScript のルール。CI の lint ジョブで実行する (docs/adr/0007-ci-quality-gate.md)
// 型情報つきのルールと循環的複雑度の上限は ADR 0013
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // 型情報を使うルール。any の受け渡しや、待たれずに捨てられる Promise を検出する
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.mts"],
    extends: [tseslint.configs.recommendedTypeCheckedOnly],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // 循環的複雑度 (分岐の数) の上限。超えたら関数を分ける。10 は McCabe が示した目安
  {
    rules: {
      complexity: ["error", { max: 10 }],
    },
  },
  // 書式は Prettier に任せる。ESLint の書式ルールと食い違わないよう最後に無効化する (ADR 0014)
  prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
    "evals/**/results/**",
  ]),
])

export default eslintConfig
