import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

// Next.js 推奨 (Core Web Vitals) + TypeScript のルール。CI の lint ジョブで実行する (docs/adr/0007-ci-quality-gate.md)
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
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
