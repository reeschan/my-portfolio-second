// @perspectives smoke
// @routes /now /now/[id]
import { afterEach, describe, expect, it, vi } from "vitest"
import { config, nowNotFoundPath, resolveNowProxy } from "@/proxy"
import type { NowPost } from "@/lib/now/schema"
import { createMemoryStore } from "@/lib/now/store"

// 知らない id の記事の 404 と、旧リンク (/now?post=<id>) の 308 を、ページに届く前に決める判定 (ADR 0035)。
// NextRequest に依らない形なので、メモリの保存先を渡して状態コードの決まりだけを確かめる

const post: NowPost = {
  id: "post-1",
  title: "近況",
  body: "本文",
  publishedAt: "2026-01-01T00:00:00.000Z",
}

async function storeWith(...posts: NowPost[]) {
  const store = createMemoryStore()
  for (const item of posts) await store.save(item)
  return store
}

const searchParams = (query = "") => new URLSearchParams(query)

describe("resolveNowProxy", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("旧リンク (/now?post=<id>) は記事のページへ転送し、転送先にクエリを残さない", async () => {
    const decision = await resolveNowProxy("/now", searchParams("post=post-1"), null)
    expect(decision).toEqual({ type: "redirect", pathname: "/now/post-1" })
    if (decision.type !== "redirect") throw new Error("転送にならなかった")
    // next.config.ts の redirects は元のクエリを転送先に残すので、proxy で作る (ADR 0035)
    expect(new URL(decision.pathname, "https://example.com/now?post=post-1").search).toBe("")
  })

  it("post が 1 つでない (?post=a&post=b) なら転送しない", async () => {
    expect(await resolveNowProxy("/now", searchParams("post=a&post=b"), null)).toEqual({ type: "next" })
  })

  it("post のクエリが無い /now は通す", async () => {
    expect(await resolveNowProxy("/now", searchParams(), null)).toEqual({ type: "next" })
  })

  it("実在の記事は通す", async () => {
    expect(await resolveNowProxy("/now/post-1", searchParams(), await storeWith(post))).toEqual({ type: "next" })
  })

  it("知らない id は 404 になるよう rewrite する", async () => {
    expect(await resolveNowProxy("/now/unknown", searchParams(), await storeWith(post))).toEqual({
      type: "rewrite",
      pathname: nowNotFoundPath,
    })
  })

  it("保存先が無ければ 404 になるよう rewrite する", async () => {
    expect(await resolveNowProxy("/now/post-1", searchParams(), null)).toEqual({ type: "rewrite", pathname: nowNotFoundPath })
  })

  it("保存先の読み込みが失敗したら通す (本物の記事まで 404 にしない)", async () => {
    const store = await storeWith(post)
    vi.spyOn(store, "get").mockRejectedValueOnce(new Error("store down"))
    const errors = vi.spyOn(console, "error").mockImplementation(() => {})

    expect(await resolveNowProxy("/now/post-1", searchParams(), store)).toEqual({ type: "next" })
    expect(errors).toHaveBeenCalledTimes(1)
  })

  it("エンコードされた id は戻して保存先で探す", async () => {
    expect(await resolveNowProxy("/now/post%201", searchParams(), await storeWith({ ...post, id: "post 1" }))).toEqual({ type: "next" })
  })

  it("proxy は /now と記事のページだけに当てる (ほかのページを遅くしない)", () => {
    expect(config.matcher).toEqual(["/now", "/now/:id"])
  })
})
