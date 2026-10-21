import { profileLinks } from "../data/overview"
import { siteUrl } from "../lib/metadata"
import { navItems } from "../lib/navigation"
import { nowPostPath } from "../lib/now/feed"
import { createNowPost, expect, routes, test, uniqueTitle } from "./fixtures"

// サイト全体の構造化データ (PBI-008・PBI-009、docs/specs/seo-stage2.md)。
// ルートのレイアウトが出す WebSite・Person を、ページの ld+json (記事の BlogPosting・/overview の ProfilePage など) と
// 合わせて集める。Next.js 16 は metadata を本文の後ろに流すので、page.goto のあとの DOM で見る。
// 期待値は data/ と lib/ の定数から作り、名前や URL を二重に書かない

type JsonLdNode = Record<string, unknown>

// 検査に使う Page の一部だけを型で受ける。E2E は fixtures.ts の test・expect だけを import する決まりのため
type JsonLdSource = {
  locator(selector: string): { allTextContents(): Promise<string[]> }
}

// ページの ld+json をすべて集め、@graph があれば展開して 1 つの配列にする。
// script は最大 2 つ (レイアウトの WebSite・Person と、ページの分) になり、1 つだけ取ると strict mode で落ちる
async function jsonLdNodes(page: JsonLdSource): Promise<JsonLdNode[]> {
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents()
  return scripts.flatMap((text) => {
    const data = JSON.parse(text) as JsonLdNode
    const graph = data["@graph"]
    return Array.isArray(graph) ? (graph as JsonLdNode[]) : [data]
  })
}

function ofType(nodes: JsonLdNode[], type: string): JsonLdNode[] {
  return nodes.filter((node) => node["@type"] === type)
}

// トップはタブの並びに無いので足す。ルートをこのファイルに写さず、タブの定義から作る
const paths = ["/", ...navItems.map((item) => item.href)]

test.describe("SEO: サイト全体の構造化データ", () => {
  for (const path of paths) {
    test(`${path} は WebSite と Person をちょうど 1 つずつ持つ`, { tag: ["@seo"], annotation: routes(path) }, async ({ page }) => {
      await page.goto(path)
      // script は本文と一緒に来るが、ページの描画を待ってから集める (初回のコンパイル中の空の DOM を数えない)
      await expect(page.locator("h1").first()).toBeVisible()

      const nodes = await jsonLdNodes(page)
      const websites = ofType(nodes, "WebSite")
      const persons = ofType(nodes, "Person")
      expect(websites.length, `${path} の WebSite の数`).toBe(1)
      expect(persons.length, `${path} の Person の数`).toBe(1)

      // GitHub と LinkedIn が同じ人物として結び付いている
      expect(persons[0]?.["sameAs"]).toEqual(profileLinks.map((link) => link.href))
      // サイトの発行者は同じ人物を指す
      expect(websites[0]?.["publisher"]).toEqual({ "@id": persons[0]?.["@id"] })
    })
  }

  test(
    "/overview は ProfilePage を 1 つ持ち、mainEntity が同じページの Person を指す",
    { tag: ["@seo"], annotation: routes("/overview") },
    async ({ page }) => {
      await page.goto("/overview")
      // ページの script は本文と一緒に来るが、描画を待ってから集める (初回のコンパイル中の空の DOM を数えない)
      await expect(page.locator("h1").first()).toBeVisible()

      const nodes = await jsonLdNodes(page)
      const profilePages = ofType(nodes, "ProfilePage")
      const persons = ofType(nodes, "Person")

      expect(profilePages.length, "/overview の ProfilePage の数").toBe(1)
      // Person はレイアウトの 1 つだけ。ProfilePage はその @id を指し、同じ人物を書き直さない
      expect(persons.length, "/overview の Person の数").toBe(1)
      expect(profilePages[0]?.["mainEntity"]).toEqual({ "@id": persons[0]?.["@id"] })
      expect(profilePages[0]?.["url"]).toBe(new URL("/overview", siteUrl).href)
    },
  )

  test("記事ページにも WebSite と Person がある", { tag: ["@seo"], annotation: routes("/now/[id]") }, async ({ page, request }) => {
    const title = uniqueTitle("構造化データの記事")
    const { id } = await createNowPost(request, { title, body: "記事の本文です。" })
    const res = await page.goto(nowPostPath(id))
    expect(res?.status()).toBe(200)

    const nodes = await jsonLdNodes(page)
    // 記事の BlogPosting は author に Person を直接書いている。@id の参照に変えるのは後続の PBI なので、
    // この PBI では数ではなく、サイト全体の分が消えていないことだけを見る
    expect(ofType(nodes, "WebSite").length).toBeGreaterThanOrEqual(1)
    expect(ofType(nodes, "Person").length).toBeGreaterThanOrEqual(1)
  })
})
