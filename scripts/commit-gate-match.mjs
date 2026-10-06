// commit-gate フック (.claude/hooks/commit-gate.mjs) が「このコマンドはコミットか」を判定する部分。
// 判定を誤ると、関係ないコマンドが止まったりゲートをすり抜けたりするので、scripts/commit-gate-match.test.ts で検証する

// ヒアドキュメントの本文と引用符の中身は「実行されるコマンド」ではないので除く
// (ドキュメントやコミットメッセージに "git commit" と書いただけで止めないため)
export function stripLiterals(cmd) {
  return cmd
    .replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2(?=\n|$)/g, "")
    .replace(/'[^']*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
}

// git commit だけを対象にする。git -C <dir> commit などのオプション付きも拾い、git commit-tree は除く
export function isGitCommit(cmd) {
  return /(^|[\s;&|(])git(\s+(-C|-c)\s+\S+|\s+--?[\w-]+(=\S+)?)*\s+commit(\s|$)/.test(stripLiterals(cmd))
}
