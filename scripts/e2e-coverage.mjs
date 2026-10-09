#!/usr/bin/env node
// testing/e2e-policy.yml と app/ のルート、テストのタグ・対象ルートを突き合わせて「ルート × 観点」の表を作る。
//
//   node scripts/e2e-coverage.mjs           表を標準出力に出す
//   node scripts/e2e-coverage.mjs --write   docs/testing/coverage-map.md を更新する
//   node scripts/e2e-coverage.mjs --check   required: true の観点に穴があれば exit 1 (CI 用)
//
// テスト側の書き方:
//   - Playwright: test("...", { tag: ["@smoke"], annotation: routes("/chat") }, ...)  (e2e/fixtures.ts の routes())
//   - Vitest:     ファイル先頭のコメントに  // @perspectives api-contract privacy  と  // @routes /api/chat
//                 ルートに紐づかない道具のテストは  // @coverage-map ignore <理由>  で表から外す

import { execFileSync } from "node:child_process"
import { readFileSync, readdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import YAML from "yaml"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const args = new Set(process.argv.slice(2))
const policy = YAML.parse(readFileSync(path.join(root, "testing/e2e-policy.yml"), "utf8"))

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git", "test-results", "playwright-report"].includes(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

// --- ルートの洗い出し (App Router) ---
function toRoute(file) {
  const rel = path.relative(path.join(root, "app"), path.dirname(file))
  const segments = rel.split(path.sep).filter((s) => s && !/^\(.*\)$/.test(s) && !s.startsWith("@"))
  return "/" + segments.join("/")
}

const appFiles = walk(path.join(root, "app"))
const exclude = new Set((policy.exclude_routes ?? []).map((r) => (typeof r === "string" ? r : r.path)))
const routes = [
  ...appFiles.filter((f) => /\/page\.(tsx|ts|jsx|js)$/.test(f)).map((f) => ({ path: toRoute(f), kind: "page" })),
  ...appFiles.filter((f) => /\/route\.(ts|js)$/.test(f)).map((f) => ({ path: toRoute(f), kind: "api" })),
]
  .filter((r) => !exclude.has(r.path))
  .sort((a, b) => (a.kind === b.kind ? a.path.localeCompare(b.path) : a.kind === "page" ? -1 : 1))

// --- テストの収集 ---
const tests = []

const listJson = execFileSync("npx", ["playwright", "test", "--list", "--reporter=json"], {
  cwd: root,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "inherit"],
  maxBuffer: 64 * 1024 * 1024,
})
const seen = new Set()
;(function collect(suite) {
  for (const spec of suite.specs ?? []) {
    const key = `${spec.file}:${spec.line}:${spec.title}`
    if (seen.has(key)) continue
    seen.add(key)
    const annotations = spec.tests.flatMap((t) => t.annotations ?? [])
    tests.push({
      source: "playwright",
      file: spec.file,
      title: spec.title,
      perspectives: spec.tags.map((t) => t.replace(/^@/, "")),
      routes: annotations.filter((a) => a.type === "route").map((a) => a.description),
    })
  }
  for (const child of suite.suites ?? []) collect(child)
})({ suites: JSON.parse(listJson).suites })

for (const file of walk(root).filter((f) => /\.test\.(ts|tsx)$/.test(f))) {
  const src = readFileSync(file, "utf8")
  // 画面やルートに紐づかない道具のテスト (コミットゲートなど) は表に載せない。理由をコメントで添える
  if (/^\/\/\s*@coverage-map\s+ignore\b/m.test(src)) continue
  const perspectives =
    src
      .match(/^\/\/\s*@perspectives\s+(.+)$/m)?.[1]
      .trim()
      .split(/\s+/) ?? []
  const testRoutes =
    src
      .match(/^\/\/\s*@routes\s+(.+)$/m)?.[1]
      .trim()
      .split(/\s+/) ?? []
  tests.push({ source: "vitest", file: path.relative(root, file), title: "(file)", perspectives, routes: testRoutes })
}

// --- 突き合わせ ---
const perspectives = Object.entries(policy.perspectives ?? {})
const enabled = perspectives.filter(([, p]) => p.enabled)
const knownNames = new Set(perspectives.map(([name]) => name))

function targets(p) {
  if (p.routes) return p.routes
  if (p.applies_to === "pages") return routes.filter((r) => r.kind === "page").map((r) => r.path)
  if (p.applies_to === "api") return routes.filter((r) => r.kind === "api").map((r) => r.path)
  return routes.map((r) => r.path)
}

const matrix = new Map() // route -> name -> count | null (対象外)
const gaps = []
for (const r of routes) matrix.set(r.path, new Map())
for (const [name, p] of enabled) {
  const t = new Set(targets(p))
  for (const r of routes) {
    if (!t.has(r.path)) {
      matrix.get(r.path).set(name, null)
      continue
    }
    const count = tests.filter((x) => x.perspectives.includes(name) && x.routes.includes(r.path)).length
    matrix.get(r.path).set(name, count)
    if (count === 0) gaps.push({ route: r.path, perspective: name, required: !!p.required })
  }
  for (const path_ of t) {
    if (!matrix.has(path_)) gaps.push({ route: path_, perspective: name, required: !!p.required, missingRoute: true })
  }
}

const warnings = []
for (const t of tests) {
  if (t.routes.length === 0) warnings.push(`対象ルートがありません: ${t.file} › ${t.title}`)
  for (const name of t.perspectives) {
    if (!knownNames.has(name) && name !== "responsive") warnings.push(`方針にない観点タグ @${name}: ${t.file} › ${t.title}`)
  }
}

// --- 出力 ---
const cols = enabled.map(([name]) => name)
const lines = [
  "<!-- このファイルは scripts/e2e-coverage.mjs が生成する。手で編集しない (pnpm test:coverage-map -- --write) -->",
  "# テストカバレッジ表 (ルート × 観点)",
  "",
  "観点の定義は [testing/e2e-policy.yml](../../testing/e2e-policy.yml)。数字はその観点のテスト数、`—` は対象外、`❌` は穴。",
  "",
  `| ルート | 種別 | ${cols.join(" | ")} |`,
  `| --- | --- | ${cols.map(() => "---:").join(" | ")} |`,
  ...routes.map((r) => {
    const cells = cols.map((c) => {
      const v = matrix.get(r.path).get(c)
      return v === null ? "—" : v === 0 ? "❌" : String(v)
    })
    return `| \`${r.path}\` | ${r.kind} | ${cells.join(" | ")} |`
  }),
  "",
  "## 穴",
  "",
  ...(gaps.length
    ? gaps.map(
        (g) =>
          `- ${g.required ? "**[必須]** " : ""}\`${g.route}\` × ${g.perspective}${g.missingRoute ? " (方針にあるルートが app/ に存在しません)" : ""}`,
      )
    : ["なし"]),
  "",
  "## 無効にしている観点",
  "",
  ...perspectives.filter(([, p]) => !p.enabled).map(([name, p]) => `- ${name}: ${p.reason ?? "(理由未記入)"}`),
  "",
]
if (warnings.length) lines.push("## 警告", "", ...warnings.map((w) => `- ${w}`), "")

const markdown = lines.join("\n")
if (args.has("--write")) {
  writeFileSync(path.join(root, "docs/testing/coverage-map.md"), markdown)
  console.log("docs/testing/coverage-map.md を更新しました")
} else {
  console.log(markdown)
}

if (args.has("--check")) {
  const required = gaps.filter((g) => g.required)
  if (required.length) {
    console.error(`\n必須観点の穴が ${required.length} 件あります`)
    process.exit(1)
  }
}
