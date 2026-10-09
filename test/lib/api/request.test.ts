// @perspectives api-contract
// @routes /api/now /api/chat
import { describe, expect, it } from "vitest"
import { z } from "zod"
import { HttpError } from "@/lib/api/errors"
import { readJsonBody } from "@/lib/api/request"

const schema = z.object({ name: z.string().min(1) })
const req = (body: string) => new Request("http://localhost/api/x", { method: "POST", body })

describe("readJsonBody", () => {
  it("スキーマに合えば検証済みの値を返す", async () => {
    expect(await readJsonBody(req('{"name":"a"}'), schema, "形式違い")).toEqual({ name: "a" })
  })

  it.each([
    ["JSON でない", "not json"],
    ["形が違う", '{"name":""}'],
  ])("%s なら 400 の HttpError を投げ、検証の詳細を添える", async (_, body) => {
    const error: unknown = await readJsonBody(req(body), schema, "形式違い").catch((e: unknown) => e)
    expect(error).toBeInstanceOf(HttpError)
    expect(error).toMatchObject({ status: 400, message: "形式違い" })
    expect((error as HttpError).options.details).toHaveProperty("issues")
  })
})
