// @perspectives interaction
// @routes /overview
import { runInNewContext } from "node:vm"
import { describe, expect, it } from "vitest"
import { htmlLangScript } from "@/lib/i18n/html-lang"

type FakeDocument = { cookie: string; documentElement: { lang: string } }

// スクリプトは document.cookie を読み、document.documentElement.lang を書き換える。
// Node には document が無いので、引数として差し替えてから実行する (スクリプト側は同じ名前で参照する)
function run(cookie: string): string {
  const doc: FakeDocument = { cookie, documentElement: { lang: "ja" } }
  runInNewContext(htmlLangScript(), { document: doc })
  return doc.documentElement.lang
}

describe("htmlLangScript", () => {
  it("英語の Cookie があると lang を en にする", () => {
    expect(run("locale=en")).toBe("en")
  })

  it("Cookie が無いときは lang を変えない", () => {
    expect(run("")).toBe("ja")
    expect(run("theme=dark")).toBe("ja")
  })

  it("知らない値・壊れた値のときは lang を変えない", () => {
    expect(run("locale=fr")).toBe("ja")
    expect(run("locale=<script>")).toBe("ja")
    expect(run("locale=EN")).toBe("ja")
    // decodeURIComponent が投げる例外は握りつぶし、既定の lang を残す
    expect(run("locale=%E0%A4%A")).toBe("ja")
  })

  it("ほかの Cookie と並んでいても locale を読める (名前の一部には反応しない)", () => {
    expect(run("theme=dark; locale=en; session=abc")).toBe("en")
    expect(run("my-locale=en")).toBe("ja")
  })
})
