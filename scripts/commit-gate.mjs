#!/usr/bin/env node
// コミット前の品質ゲート。commit-gate スキル (.claude/skills/commit-gate/SKILL.md) から使う。
//
//   node scripts/commit-gate.mjs                 ステージ済みの変更を検査し、通れば「合格の印」を残す
//   node scripts/commit-gate.mjs --waive "理由"   E2E を足さない理由を明記して検査する (見た目を変えないリファクタなど)
//   node scripts/commit-gate.mjs verify          今ステージされている内容が合格済みかだけを確かめる (フックから呼ぶ)
//
// 検査の内容:
//   1. 画面・機能のコード (app/ components/ lib/ hooks/) を変えたなら、テストも一緒にステージされているか
//      - 画面 (app/ のページ・components/) を変えたら e2e/*.spec.ts が必要
//      - lib/ hooks/ app/api/ だけなら e2e/*.spec.ts か *.test.ts のどちらかでよい
//      - data/ だけの変更は不要 (e2e/content.spec.ts が data/ を読んで検証するため)
//   2. lint / 型チェック / ユニット / 必須観点の穴 / E2E がすべて通るか
//
// 合格の印は .git/commit-gate.json に「ステージ内容のツリー ID」と一緒に保存する。
// 印を残したあとにステージ内容が 1 文字でも変われば、ツリー ID が変わるので印は無効になる。

import { execFileSync, spawnSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim()
const root = git("rev-parse", "--show-toplevel")
const stampPath = path.join(git("rev-parse", "--absolute-git-dir"), "commit-gate.json")

const args = process.argv.slice(2)
const mode = args[0] === "verify" ? "verify" : "check"
const waiveIndex = args.indexOf("--waive")
const waiveReason = waiveIndex >= 0 ? args[waiveIndex + 1] : null

const stagedTree = () => git("write-tree")
const stagedFiles = () => git("diff", "--cached", "--name-only", "--diff-filter=ACMRD").split("\n").filter(Boolean)

// ドキュメントだけの変更はゲートを通さなくてよい (テストに影響しない)
const isDocsOnly = (files) => files.length > 0 && files.every((f) => /\.md$/.test(f) || f.startsWith("docs/"))

if (mode === "verify") {
  const files = stagedFiles()
  if (files.length === 0 || isDocsOnly(files)) process.exit(0)
  if (!existsSync(stampPath)) {
    console.error("commit-gate: まだ検査していません。commit-gate スキル (pnpm commit-gate) を実行してからコミットしてください")
    process.exit(1)
  }
  const stamp = JSON.parse(readFileSync(stampPath, "utf8"))
  if (stamp.tree !== stagedTree()) {
    console.error(
      "commit-gate: 検査したあとでステージ内容が変わっています。もう一度 pnpm commit-gate を実行してください\n" +
        "  (git add と git commit を 1 つのコマンドにまとめたり、git commit -a を使うと、この状態になります)",
    )
    process.exit(1)
  }
  process.exit(0)
}

// ---- check ----
const files = stagedFiles()
if (files.length === 0) {
  console.error("commit-gate: ステージされた変更がありません。git add してから実行してください")
  process.exit(1)
}

const isTest = (f) => /\.test\.tsx?$/.test(f) || f.startsWith("e2e/")
const uiFiles = files.filter((f) => !isTest(f) && (/^app\/(?!api\/).+\.(tsx?|css)$/.test(f) || /^components\/.+\.tsx?$/.test(f)))
const logicFiles = files.filter((f) => !isTest(f) && (/^(lib|hooks)\/.+\.tsx?$/.test(f) || /^app\/api\/.+\.ts$/.test(f)))
const e2eSpecs = files.filter((f) => /^e2e\/.+\.spec\.ts$/.test(f))
const unitTests = files.filter((f) => /\.test\.tsx?$/.test(f))

const problems = []
if (uiFiles.length && !e2eSpecs.length && !waiveReason) {
  problems.push(`画面のコードを変更していますが、E2E テスト (e2e/*.spec.ts) がステージされていません:\n${uiFiles.map((f) => `    - ${f}`).join("\n")}`)
}
if (logicFiles.length && !e2eSpecs.length && !unitTests.length && !waiveReason) {
  problems.push(`処理のコードを変更していますが、テスト (e2e/*.spec.ts か *.test.ts) がステージされていません:\n${logicFiles.map((f) => `    - ${f}`).join("\n")}`)
}
if (problems.length) {
  console.error(`commit-gate: 不合格\n\n${problems.join("\n\n")}\n\n` +
    "テストを足して git add してから、もう一度実行してください。\n" +
    '振る舞いを変えないリファクタなどで本当に不要な場合だけ --waive "理由" を付けます (理由はコミットメッセージにも書く)')
  process.exit(1)
}

const tree = stagedTree()

// ステージしていない変更があると「検査したもの」と「コミットするもの」がずれるので止める
const unstaged = git("diff", "--name-only")
if (unstaged) {
  console.error(`commit-gate: ステージしていない変更があります。検査対象をそろえるため、ステージするか退避 (git stash -k) してください:\n${unstaged}`)
  process.exit(1)
}

const steps = [
  ["lint", ["pnpm", "lint"]],
  ["型チェック", ["pnpm", "typecheck"]],
  ["ユニットテスト", ["pnpm", "test:unit"]],
  ["必須観点の穴", ["pnpm", "test:coverage-map", "--", "--check"]],
  ["E2E", ["pnpm", "test:e2e"]],
]
const results = []
for (const [name, [cmd, ...cmdArgs]] of steps) {
  console.log(`\n=== commit-gate: ${name} (${[cmd, ...cmdArgs].join(" ")}) ===`)
  const started = Date.now()
  const r = spawnSync(cmd, cmdArgs, { cwd: root, stdio: "inherit", env: { ...process.env, CI: "" } })
  results.push({ name, ok: r.status === 0, seconds: Math.round((Date.now() - started) / 1000) })
  if (r.status !== 0) {
    console.error(`\ncommit-gate: 不合格 (${name} が失敗しました)。直してから、もう一度実行してください`)
    process.exit(1)
  }
}

if (stagedTree() !== tree) {
  console.error("commit-gate: 検査中にステージ内容が変わりました。もう一度実行してください")
  process.exit(1)
}

writeFileSync(
  stampPath,
  JSON.stringify({ tree, at: new Date().toISOString(), files, e2eSpecs, unitTests, waiveReason, results }, null, 2) + "\n",
)
console.log(`\ncommit-gate: 合格。このままコミットできます${waiveReason ? ` (E2E 免除の理由: ${waiveReason})` : ""}`)
