#!/usr/bin/env node
// Claude Code の PreToolUse フック。Bash でコミットしようとしたら、commit-gate の合格の印があるかを確かめる。
// 印がなければ exit 2 でコマンドを止め、理由を Claude に返す (Claude は commit-gate スキルを実行してからやり直す)
import { spawnSync } from "node:child_process"
import path from "node:path"
import { pathToFileURL } from "node:url"

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd()
const { isGitCommit } = await import(pathToFileURL(path.join(projectDir, "scripts/commit-gate-match.mjs")).href)

let input = ""
for await (const chunk of process.stdin) input += chunk

const command = (() => {
  try {
    return JSON.parse(input).tool_input?.command ?? ""
  } catch {
    return ""
  }
})()

if (!isGitCommit(command)) process.exit(0)

const r = spawnSync("node", ["scripts/commit-gate.mjs", "verify"], { encoding: "utf8", cwd: projectDir })
if (r.status === 0) process.exit(0)

process.stderr.write(
  `${r.stderr || r.stdout}\n` +
    "コミットの前に commit-gate スキル (.claude/skills/commit-gate/SKILL.md) の手順で検査してください。\n" +
    "git add → pnpm commit-gate → (合格したら) git commit の順に、別々のコマンドで実行します。\n",
)
process.exit(2)
