import { ja } from "../data/messages/ja"
import { certifications } from "../data/skills"
import { works } from "../data/works"
import { expect, routes, test } from "./fixtures"

// JS を動かさないクローラーは <div hidden id="S:"> の中を読まない (PBI-0036、ADR 0038)。
// script の RSC ペイロードにも同じ文言が入るので、本文の位置を見る前に script と穴を除く。
// 期待値は data/ から取る。説明文 (meta) には無く、本文にだけある文言を選ぶ。

const workTitle = works[0]?.title
const certification = certifications[0]
if (!workTitle || !certification) throw new Error("本文の期待値が data/ に無い")

const pages = [
  { path: "/works", phrase: workTitle },
  { path: "/skills", phrase: certification },
  { path: "/now", phrase: ja.now.intro },
] as const

for (const item of pages) {
  test(`SEO: ${item.path} の本文は hidden id="S:" の外にある`, { tag: ["@seo"], annotation: routes(item.path) }, async ({ request }) => {
    const res = await request.get(item.path)
    expect(res.status()).toBe(200)
    const visible = htmlVisibleToCrawlers(await res.text())
    expect(visible, `${item.path} の「${item.phrase}」が hidden id="S:" の中だけにある`).toContain(item.phrase)
  })
}

function htmlVisibleToCrawlers(html: string): string {
  const withoutScripts = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
  return stripHiddenStreams(withoutScripts)
}

// <div hidden id="S:..."> を、中の div ごと除く。属性の並びは応答によって変わる
function stripHiddenStreams(html: string): string {
  const open = /<div\b(?=[^>]*\bhidden\b)(?=[^>]*\bid="S:)[^>]*>/g
  let result = ""
  let cursor = 0
  for (const match of html.matchAll(open)) {
    const start = match.index
    if (start === undefined || start < cursor) continue
    result += html.slice(cursor, start)
    cursor = endOfDiv(html, start)
  }
  result += html.slice(cursor)
  return result
}

function endOfDiv(html: string, start: number): number {
  const token = /<div\b|<\/div>/g
  token.lastIndex = start
  let depth = 0
  let match = token.exec(html)
  while (match) {
    if (match[0] === "</div>") {
      depth -= 1
      if (depth === 0) return match.index + match[0].length
    } else {
      depth += 1
    }
    match = token.exec(html)
  }
  return html.length
}
