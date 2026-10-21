// @coverage-map ignore sitemap.xml は page でも route.ts でもなく表の対象外。E2E は e2e/seo.spec.ts
import { afterEach, describe, expect, it, vi } from "vitest"
import sitemap from "@/app/sitemap"
import { siteUrl } from "@/lib/metadata"
import { navItems } from "@/lib/navigation"
import { nowPostPath } from "@/lib/now/feed"
import type { NowPost } from "@/lib/now/schema"
import { getNowStore } from "@/lib/now/store"

// connection() はリクエストの外では動かないので、置き換える (test/app/api/now/route.test.ts と同じ)
vi.mock("next/server", () => ({ connection: () => Promise.resolve() }))

// 保存先は NODE_ENV が production でないときのメモリ。本物の Upstash は呼ばない
const store = getNowStore()!

const post = (id: string, publishedAt: string, updatedAt?: string): NowPost => ({
  id,
  title: `題名 ${id}`,
  body: "本文",
  publishedAt,
  ...(updatedAt === undefined ? {} : { updatedAt }),
})

// 期待値はタブの並びの定義から作る。道具のページ (印の付いたページ) は sitemap に載らない (docs/specs/seo-stage2.md)
const fixedUrls = [siteUrl.href, ...navItems.filter((item) => !item.utility).map((item) => new URL(item.href, siteUrl).href)]

describe("sitemap", () => {
  // 記事はテストの中で入れて、終わったら消す (メモリの保存先はテストの間ずっと生きている)
  const savedIds: string[] = []

  afterEach(async () => {
    await Promise.all(savedIds.splice(0).map((id) => store.remove(id)))
    vi.restoreAllMocks()
  })

  const save = async (saved: NowPost) => {
    await store.save(saved)
    savedIds.push(saved.id)
  }

  it("保存先に記事が無いとき、トップと印の付いていないタブのページだけを本番の URL で載せる", async () => {
    const urls = (await sitemap()).map((entry) => entry.url)
    expect(urls).toEqual(fixedUrls)
  })

  it("記事があると、固定のページのあとに新しい順で足し、lastModified に更新日 (無ければ公開日) を入れる", async () => {
    await save(post("updated", "2026-10-02T00:00:00.000Z", "2026-10-05T00:00:00.000Z"))
    await save(post("published-only", "2026-10-01T00:00:00.000Z"))

    const entries = await sitemap()

    expect(entries.map((entry) => entry.url)).toEqual([
      ...fixedUrls,
      new URL(nowPostPath("updated"), siteUrl).href,
      new URL(nowPostPath("published-only"), siteUrl).href,
    ])
    // 一度も更新していない記事は公開日を lastModified にする (ADR 0030)
    expect(entries.slice(fixedUrls.length)).toEqual([
      { url: new URL(nowPostPath("updated"), siteUrl).href, lastModified: "2026-10-05T00:00:00.000Z" },
      { url: new URL(nowPostPath("published-only"), siteUrl).href, lastModified: "2026-10-01T00:00:00.000Z" },
    ])
  })

  it("保存先の list() が例外を投げても、固定のページだけを返す", async () => {
    // 記事が 1 件あっても、落ちたときは載せない (空の一覧と取り違えない)
    await save(post("hidden", "2026-10-03T00:00:00.000Z"))
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(store, "list").mockRejectedValueOnce(new Error("down"))

    const urls = (await sitemap()).map((entry) => entry.url)

    expect(urls).toEqual(fixedUrls)
    expect(consoleError).toHaveBeenCalledOnce()
  })
})
