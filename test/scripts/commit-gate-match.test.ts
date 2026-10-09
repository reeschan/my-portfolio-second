// @coverage-map ignore コミットゲート (開発の道具) のテストで、画面・ルートに紐づかないため
import { describe, expect, it } from "vitest"
// フックから Node で直接読むため JS (.mjs) のままにしている
import { isGitCommit } from "@/scripts/commit-gate-match.mjs"

describe("isGitCommit", () => {
  it.each([
    "git commit -m 'msg'",
    "git -C /repo commit -m x",
    "git -c user.name=a commit",
    "pnpm lint && git commit -m x",
    'git add a.ts && git commit -m "x"',
    "git commit --amend --no-edit",
  ])("コミットとして止める: %s", (cmd) => {
    expect(isGitCommit(cmd)).toBe(true)
  })

  it.each([
    "git status",
    "git commit-tree abc -m x",
    "git log --grep commit",
    'echo "git commit してください"',
    "grep -rn 'git commit' docs",
    "cat > a.md <<'EOF'\nあとで git commit する\nEOF",
  ])("コミットではないので通す: %s", (cmd) => {
    expect(isGitCommit(cmd)).toBe(false)
  })
})
