import { HttpError } from "@/lib/api/errors"
import { readJsonBody } from "@/lib/api/request"
import { nowWriteErrors } from "./auth"
import { nowPostInputSchema, type NowPostInput } from "./schema"

// POST /api/now と PUT /api/now/[id] の入力を読む (PBI-0015)
// - application/json: { title, body, publishedAt? } (今までどおり)
// - multipart/form-data: file に Markdown のファイル、title と publishedAt は任意のテキスト
//   Postman などで .md を選んでそのまま投稿できるようにする。JSON に詰め直す手間 (jq など) をなくす
export async function readNowPostInput(request: Request): Promise<NowPostInput> {
  if (!isMultipart(request)) return readJsonBody(request, nowPostInputSchema, nowWriteErrors.invalid)

  const form = await request.formData().catch(() => {
    throw invalid("フォームを読めませんでした。")
  })
  const file = form.get("file")
  if (!(file instanceof File)) throw invalid("file に Markdown のファイルを指定してください。")

  const { title, body } = splitTitle(await file.text(), textField(form, "title"), file.name)
  const parsed = nowPostInputSchema.safeParse({ title, body, publishedAt: textField(form, "publishedAt") })
  if (!parsed.success) throw new HttpError(400, nowWriteErrors.invalid, { details: { issues: parsed.error.issues } })
  return parsed.data
}

function isMultipart(request: Request): boolean {
  return (request.headers.get("content-type") ?? "").toLowerCase().startsWith("multipart/form-data")
}

function invalid(reason: string): HttpError {
  return new HttpError(400, nowWriteErrors.invalid, { details: { reason } })
}

// 空欄のテキストは「指定なし」として扱う (Postman で行を残したまま値を消しても通るように)
function textField(form: FormData, name: string): string | undefined {
  const value = form.get(name)
  return typeof value === "string" && value.trim() !== "" ? value : undefined
}

// 題名の決め方: title 欄 → 本文の先頭の「# 見出し」→ ファイル名 (拡張子なし) の順
// 先頭の見出しを題名にしたときは、本文から外す (ダイアログの題と本文の見出しが二重に出ないように)
export function splitTitle(markdown: string, title: string | undefined, fileName: string): { title: string; body: string } {
  const text = markdown.replace(/^\uFEFF/, "")
  if (title) return { title, body: text }

  const heading = /^\s*# +(.+?)(?:[ \t]+#+)?[ \t]*(?:\r?\n|$)/.exec(text)
  if (heading?.[1]) return { title: heading[1], body: text.slice(heading[0].length) }

  return { title: fileName.replace(/\.(md|markdown)$/i, ""), body: text }
}
