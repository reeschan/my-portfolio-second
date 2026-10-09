import type { z } from "zod"
import { HttpError } from "./errors"

// リクエストの JSON をスキーマで検証して返す。JSON でない・形が違うなら 400 の HttpError を投げる
export async function readJsonBody<S extends z.ZodType>(request: Request, schema: S, message: string): Promise<z.output<S>> {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw new HttpError(400, message, { details: { issues: parsed.error.issues } })
  return parsed.data
}
