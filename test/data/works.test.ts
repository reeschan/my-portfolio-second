// @perspectives content
// @routes /works
import { existsSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { works } from "@/data/works"

const publicDir = path.join(process.cwd(), "public")

describe("works のデータ", () => {
  it("作品が 6 件あり、id が重ならない", () => {
    expect(works).toHaveLength(6)
    const ids = works.map((work) => work.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("どの作品もライト用・ダーク用の図が public/works/<id>/ にある", () => {
    for (const work of works) {
      expect(work.architecture.light).toBe(`/works/${work.id}/architecture-light.svg`)
      expect(work.architecture.dark).toBe(`/works/${work.id}/architecture-dark.svg`)
      expect(existsSync(path.join(publicDir, work.architecture.light))).toBe(true)
      expect(existsSync(path.join(publicDir, work.architecture.dark))).toBe(true)
    }
  })

  it("公開リポジトリの url は https://github.com/reeschan/ で始まる", () => {
    const publicWorks = works.filter((work) => work.repository.visibility === "public")
    expect(publicWorks.length).toBeGreaterThan(0)
    for (const work of publicWorks) {
      expect(work.repository.url.startsWith("https://github.com/reeschan/")).toBe(true)
    }
  })

  it("説明・図の代替テキスト・本文が空でなく、使用技術が 1 個以上ある", () => {
    for (const work of works) {
      expect(work.description.trim()).not.toBe("")
      expect(work.architecture.alt.trim()).not.toBe("")
      expect(work.body.trim()).not.toBe("")
      expect(work.tech.length).toBeGreaterThanOrEqual(1)
    }
  })
})
