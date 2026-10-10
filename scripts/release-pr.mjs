// develop → main のリリース PR を作る・本文を更新する (.github/workflows/release-pr.yml から実行する)。
// main は develop → main の PR でだけ更新する運用なので、その PR を手で作る手間と、含まれる変更の書き漏れをなくすため。
// 本文を組み立てる部分は純粋関数にして test/scripts/release-pr.test.ts で検証する (API は呼ばない)。
// 依存を足さないよう、API は Node 22 の fetch で直接呼ぶ。
import { pathToFileURL } from "node:url"

/**
 * GitHub API の pulls の形のうち、このスクリプトが使う部分
 * @typedef {object} PullRequest
 * @property {number} number
 * @property {string} title
 * @property {string} html_url
 * @property {{ login: string } | null} [user]
 * @property {string | null} [merged_at]
 * @property {{ ref: string }} head
 * @property {string | null} [body]
 */

const SUMMARY_HEADING = /^##\s+概要\s*$/m
const SUMMARY_MAX_LENGTH = 200
const BODY_MARKER =
  "<!-- release-pr: このコメントより下は release-pr ワークフローが自動で書き換える。手で編集しても次の更新で上書きされる -->"

// 見出し直後の、空行でも別の見出しでもない最初の行。次の見出しに当たったら中身が無いとみなす
function firstMeaningfulLine(text) {
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (line === "") continue
    if (/^#{1,6}\s/.test(line)) return ""
    return line
  }
  return ""
}

// 一覧が長くなりすぎないよう、概要は 200 文字で切る。サロゲートペアを割らないよう文字単位で数える
function truncate(text, max = SUMMARY_MAX_LENGTH) {
  const chars = Array.from(text)
  return chars.length > max ? `${chars.slice(0, max).join("")}…` : text
}

/**
 * PR 本文の「## 概要」直後の最初の意味のある 1 行を返す。HTML コメントと空行は飛ばす
 * @param {string | null | undefined} body
 * @returns {string}
 */
export function extractSummary(body) {
  if (typeof body !== "string") return ""
  const match = SUMMARY_HEADING.exec(body)
  if (!match) return ""
  // テンプレートの説明コメント (<!-- ... -->) は複数行にまたがることがあるので、行に分ける前に消す
  const rest = body.slice(match.index + match[0].length).replace(/<!--[\s\S]*?-->/g, "")
  return truncate(firstMeaningfulLine(rest).replace(/^- /, ""))
}

/**
 * 前回のリリース以降に develop へマージされた PR を、マージの古い順に返す
 * @param {PullRequest[]} developPrs
 * @param {string | null} lastReleaseMergedAt
 * @returns {PullRequest[]}
 */
export function selectReleasedPrs(developPrs, lastReleaseMergedAt) {
  const since = lastReleaseMergedAt === null ? null : Date.parse(lastReleaseMergedAt)
  return developPrs
    .filter((pr) => {
      if (!pr.merged_at) return false
      // main を develop に戻す同期の PR はリリースの中身ではないので除く
      if (pr.head.ref === "main") return false
      return since === null || Date.parse(pr.merged_at) > since
    })
    .sort((a, b) => Date.parse(a.merged_at ?? "") - Date.parse(b.merged_at ?? ""))
}

function prLines(pr) {
  const author = pr.user?.login ? ` (@${pr.user.login})` : ""
  const lines = [`- #${pr.number} ${pr.title}${author}`]
  const summary = extractSummary(pr.body)
  if (summary) lines.push(`  - ${summary}`)
  return lines
}

/**
 * リリース PR の本文 (Markdown)
 * @param {{ prs: PullRequest[], compareUrl: string, generatedAt: string }} params
 * @returns {string}
 */
export function buildReleaseBody({ prs, compareUrl, generatedAt }) {
  const prSection = prs.length > 0 ? prs.flatMap(prLines) : ["(前回のリリース以降にマージされた PR はありません)"]
  return [
    BODY_MARKER,
    "",
    "## 概要",
    "",
    `develop の変更を main (本番) に反映する。前回のリリース以降にマージされた PR は ${prs.length} 件`,
    "",
    "## 含まれる PR",
    "",
    ...prSection,
    "",
    "## 差分",
    "",
    `[main...develop](${compareUrl})`,
    "",
    "## マージの前に",
    "",
    "- [ ] CI (ci-ok) が緑",
    "- [ ] Vercel のプレビューで主要な画面を確かめた",
    "- [ ] Squash and merge でマージする (main は Squash のみ)",
    "- [ ] マージ後、main を develop にマージして揃える",
    "",
    `生成: ${generatedAt}`,
    "",
  ].join("\n")
}

/**
 * リリース PR のタイトル。日付は本番の利用者に合わせて Asia/Tokyo で数える
 * @param {Date} date
 * @returns {string}
 */
export function releaseTitle(date) {
  // sv-SE は YYYY-MM-DD で出るので、文字列を組み立て直さずに済む
  const day = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(date)
  return `release: develop → main (${day})`
}

// ---- ここから下は直接実行したときだけ使う (API を呼ぶ部分) ----

const API_BASE = "https://api.github.com"

// API 呼び出しはここに集める。トークンはヘッダーにだけ入れ、エラーやログには出さない
async function githubApi(token, pathOrUrl, { method = "GET", body } = {}) {
  const url = pathOrUrl.startsWith("https://") ? pathOrUrl : `${API_BASE}${pathOrUrl}`
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const message = data && typeof data.message === "string" ? data.message : res.statusText
    throw new Error(`GitHub API ${method} ${new URL(url).pathname} が失敗した: ${res.status} ${message}`)
  }
  return { data, link: res.headers.get("link") }
}

function nextLink(link) {
  if (!link) return null
  const next = link.split(",").find((part) => /rel="next"/.test(part))
  return next?.match(/<([^>]+)>/)?.[1] ?? null
}

async function latestReleaseMergedAt(token, repo, owner) {
  const { data } = await githubApi(
    token,
    `/repos/${repo}/pulls?state=closed&base=main&head=${owner}:develop&sort=updated&direction=desc&per_page=50`,
  )
  const mergedAts = data.map((pr) => pr.merged_at).filter(Boolean)
  // ISO 8601 (UTC) の文字列なので、辞書順の最大がいちばん新しい
  return mergedAts.length > 0 ? mergedAts.sort().at(-1) : null
}

// 古い PR まで追いすぎないよう、ページは最大 5 (500 件) までにする
async function fetchDevelopPrs(token, repo, maxPages = 5) {
  const prs = []
  let next = `/repos/${repo}/pulls?state=closed&base=develop&sort=updated&direction=desc&per_page=100`
  for (let page = 0; next && page < maxPages; page++) {
    const { data, link } = await githubApi(token, next)
    prs.push(...data)
    next = nextLink(link)
  }
  return prs
}

async function upsertReleasePr(token, repo, owner, { title, body }) {
  const { data: open } = await githubApi(token, `/repos/${repo}/pulls?state=open&base=main&head=${owner}:develop`)
  if (open.length > 0) {
    const { data } = await githubApi(token, `/repos/${repo}/pulls/${open[0].number}`, { method: "PATCH", body: { title, body } })
    return { pr: data, action: "更新" }
  }
  const { data } = await githubApi(token, `/repos/${repo}/pulls`, { method: "POST", body: { title, head: "develop", base: "main", body } })
  return { pr: data, action: "作成" }
}

async function main() {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPOSITORY
  if (!token || !repo) {
    console.error("環境変数 GITHUB_TOKEN と GITHUB_REPOSITORY (owner/repo) を設定してください")
    process.exit(1)
  }
  const owner = repo.split("/")[0]

  const { data: compare } = await githubApi(token, `/repos/${repo}/compare/main...develop`)
  // 差分が無いときは PR を作れない (GitHub が拒む) ので何もしない。開いている PR にも触らない
  if (!compare.files || compare.files.length === 0) {
    console.log("差分なし: develop と main に違いが無いので、リリース PR は作らない")
    return
  }

  const lastReleaseMergedAt = await latestReleaseMergedAt(token, repo, owner)
  const prs = selectReleasedPrs(await fetchDevelopPrs(token, repo), lastReleaseMergedAt)
  const now = new Date()
  const body = buildReleaseBody({
    prs,
    compareUrl: compare.html_url ?? `https://github.com/${repo}/compare/main...develop`,
    generatedAt: now.toISOString(),
  })
  const { pr, action } = await upsertReleasePr(token, repo, owner, { title: releaseTitle(now), body })
  console.log(`リリース PR を${action}した: ${pr.html_url} (含めた PR: ${prs.length} 件)`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
