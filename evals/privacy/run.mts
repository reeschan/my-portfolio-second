// チャットのプライバシー eval を本物の LLM に対して回す。
//
//   pnpm eval:privacy                 cases.yml の全ケースを trials 回ずつ実行して採点する
//   pnpm eval:privacy --case ask-email --trials 1
//   pnpm eval:privacy --dry-run       LLM を呼ばずに、決まった安全な回答で仕組みだけ確かめる
//
// - 外部 LLM を呼ぶので CI・E2E からは実行しない (AGENTS.md)。MOONSHOT_API_KEY は .env.local から読む
// - 結果は results/ (コミットしない) に必ず出し、基準を満たしたときだけ success/ にも保存する (コミットして残す)
// - 採点は伏せ字 (lib/chat/redact.ts) をかける前の「生の回答」で行う。伏せ字は保険であり、プロンプト自体の出来を測るため

import { createHash } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { parseArgs } from "node:util"
import YAML from "yaml"
import { z } from "zod"
import { redact } from "../../lib/chat/redact"
import { buildSystemPrompt } from "../../lib/chat/system-prompt"
import { promptLeakLines, scoreAnswer, summarize, type CaseSummary, type Criteria, type EvalCase } from "./score"

const dir = path.dirname(new URL(import.meta.url).pathname)
const root = path.resolve(dir, "../..")

const { values: args } = parseArgs({
  options: {
    case: { type: "string", multiple: true },
    trials: { type: "string" },
    "dry-run": { type: "boolean", default: false },
    concurrency: { type: "string", default: "3" },
  },
})

if (existsSync(path.join(root, ".env.local"))) process.loadEnvFile(path.join(root, ".env.local"))

const spec = YAML.parse(readFileSync(path.join(dir, "cases.yml"), "utf8")) as { pass_criteria: Criteria; cases: EvalCase[] }
const criteria: Criteria = { ...spec.pass_criteria, trials: Number(args.trials ?? spec.pass_criteria.trials) }
const cases = args.case ? spec.cases.filter((c) => args.case!.includes(c.id)) : spec.cases
const dryRun = args["dry-run"]

const apiKey = process.env.MOONSHOT_API_KEY
const baseUrl = process.env.MOONSHOT_BASE_URL ?? "https://api.moonshot.ai/v1"
const model = process.env.MOONSHOT_MODEL ?? "kimi-k2.6"
if (!dryRun && !apiKey) {
  console.error("MOONSHOT_API_KEY がありません。.env.local に書くか、--dry-run で仕組みだけ確かめてください")
  process.exit(2)
}

const forbiddenPath = path.join(dir, "forbidden.local.yml")
const forbiddenFileSchema = z.object({ terms: z.array(z.string()).optional() }).nullish()
const forbiddenTerms: string[] = existsSync(forbiddenPath)
  ? (forbiddenFileSchema.parse(YAML.parse(readFileSync(forbiddenPath, "utf8")))?.terms ?? [])
  : []
if (!forbiddenTerms.length) console.warn("forbidden.local.yml がないため、本人固有の語の検査は行いません (forbidden.example.yml を参照)")

// 非ストリームの応答のうち、採点に使う本文だけの形
const completionSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullish() }).nullish() })).optional(),
})

async function ask(systemPrompt: string, messages: EvalCase["messages"]): Promise<string> {
  if (dryRun) return "申し訳ありませんが、その情報はお答えできません。詳しくは LinkedIn からメッセージをお送りください。"

  // 本番の /api/chat と同じモデル・同じシステムプロンプト・同じ上限で呼ぶ (ストリームはしない)
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, stream: false, max_tokens: 8192, messages: [{ role: "system", content: systemPrompt }, ...messages] }),
  })
  if (!res.ok) throw new Error(`LLM API error ${res.status}: ${await res.text()}`)
  // 思考過程 (reasoning_content) は画面に出さないので採点対象外。本文だけを見る
  const body = completionSchema.parse(await res.json())
  return body.choices?.[0]?.message?.content ?? ""
}

// 同時実行数を抑えて順に処理する (レート制限対策)
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++
        // i は items.length 未満なので要素は必ずある
        out[i] = await fn(items[i] as T)
      }
    }),
  )
  return out
}

// 1 ケースを 1 回試して採点する
async function runTrial(systemPrompt: string, leakLines: string[], c: EvalCase, t: number) {
  const raw = await ask(systemPrompt, c.messages)
  const result = scoreAnswer(raw, c, { forbiddenTerms, leakLines })
  // 伏せ字のあとに残ったものは、利用者の画面に実際に出てしまう重大な漏れ
  const leakedAfterRedaction = !scoreAnswer(redact(raw), { expect_refusal: c.expect_refusal }, { forbiddenTerms, leakLines: [] }).passed
  const checks = result.findings.length ? `  ${result.findings.map((f) => f.check).join(",")}` : ""
  process.stdout.write(`${result.passed ? "✓" : "✗"} ${c.id} #${t + 1}${checks}\n`)
  // 不合格の回答には個人情報が入りうるので、ファイルには合格した回答の冒頭だけを残す
  return { id: c.id, trial: t + 1, ...result, leakedAfterRedaction, answerExcerpt: result.passed ? raw.slice(0, 300) : null }
}

// 基準を満たした全ケース・本番モデルの結果だけを success/ に残す
function saveSuccess(report: object, success: boolean, stamp: string, promptHash: string) {
  // 一部のケースだけ回した結果や dry-run は、プロンプトの成績として残さない
  const partial = !!args.case || criteria.trials < spec.pass_criteria.trials
  if (success && !dryRun && !partial) {
    const file = path.join(dir, "success", `${stamp.slice(0, 10)}-${model}-${promptHash}.json`)
    writeFileSync(file, JSON.stringify(report, null, 2) + "\n")
    console.log(`Success: ${path.relative(root, file)} に保存しました。コミットして成績を残してください`)
    return
  }
  console.log(success ? "基準は満たしましたが、dry-run / 一部実行のため Success には保存しません" : "基準を満たさなかったため Success には保存しません")
  if (!success) process.exitCode = 1
}

// 処理の流れを main にまとめ、最後に 1 か所で失敗を拾う
async function main() {
  const systemPrompt = await buildSystemPrompt()
  const leakLines = promptLeakLines(systemPrompt)
  const sha = (s: string) => createHash("sha256").update(s).digest("hex")
  // 指示文 (資料より前) のハッシュ。プロンプトを直したら変わるので、どの版の成績かを辿れる
  const promptHash = sha(systemPrompt.split("<resume>")[0] ?? "").slice(0, 12)


  const jobs = cases.flatMap((c) => Array.from({ length: criteria.trials }, (_, t) => ({ c, t })))
  const answers = await mapLimit(jobs, Number(args.concurrency), ({ c, t }) => runTrial(systemPrompt, leakLines, c, t))

  const caseSummaries: CaseSummary[] = cases.map((c) => ({ id: c.id, severity: c.severity, trials: answers.filter((a) => a.id === c.id) }))
  const summary = summarize(caseSummaries, criteria)

  const report = {
    kind: "chat-privacy-eval",
    executedAt: new Date().toISOString(),
    dryRun,
    model: dryRun ? "dry-run" : model,
    promptHash,
    casesHash: sha(readFileSync(path.join(dir, "cases.yml"), "utf8")).slice(0, 12),
    forbiddenTermsChecked: forbiddenTerms.length,
    criteria,
    summary: { ...summary, refusalRate: answers.filter((a) => a.refused).length / (answers.length || 1) },
    leakedAfterRedaction: answers.filter((a) => a.leakedAfterRedaction).map((a) => `${a.id}#${a.trial}`),
    cases: caseSummaries.map((c) => ({
      id: c.id,
      severity: c.severity,
      passed: c.trials.every((t) => t.passed),
      trials: answers.filter((a) => a.id === c.id).map(({ trial, passed, refused, findings, answerExcerpt }) => ({ trial, passed, refused, findings, answerExcerpt })),
    })),
  }

  const stamp = report.executedAt.replace(/[:.]/g, "-")
  mkdirSync(path.join(dir, "results"), { recursive: true })
  writeFileSync(path.join(dir, "results", `${stamp}.json`), JSON.stringify(report, null, 2) + "\n")

  console.log(`\n合格 ${summary.passed}/${summary.total} (${(summary.passRate * 100).toFixed(1)}%)  critical の不合格: ${summary.criticalFailures.join(", ") || "なし"}`)

  saveSuccess(report, summary.success, stamp, promptHash)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
