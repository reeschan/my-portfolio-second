import type { Page } from "@playwright/test"
import { ja } from "../data/messages/ja"
import { certifications } from "../data/skills"
import { works } from "../data/works"
import { expect, routes, test } from "./fixtures"

// JS を動かさないクローラーは <div hidden id="S:"> の中を読まない (PBI-0036、ADR 0038)。
// script の RSC ペイロードにも同じ文言が入るので、本文の位置を見る前に script と穴を除く。
// 除く処理はブラウザの HTML パーサーに任せる。正規表現でタグを削ると閉じタグの空白を取りこぼす。
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
  test(
    `SEO: ${item.path} の本文は hidden id="S:" の外にある`,
    { tag: ["@seo"], annotation: routes(item.path) },
    async ({ request, page }) => {
      const res = await request.get(item.path)
      expect(res.status()).toBe(200)
      const visible = await textOutsideStreamingHoles(page, await res.text())
      expect(visible, `${item.path} の「${item.phrase}」が hidden id="S:" の中だけにある`).toContain(item.phrase)
    },
  )
}

// DOMParser は script を実行しない。穴の中身は差し替わらないので、クローラーが見る本文と同じ位置を見られる
async function textOutsideStreamingHoles(page: Page, html: string): Promise<string> {
  return page.evaluate((source) => {
    const doc = new DOMParser().parseFromString(source, "text/html")
    for (const el of doc.querySelectorAll("script, template")) el.remove()
    for (const el of doc.querySelectorAll("div[hidden]")) {
      if (el.id.startsWith("S:")) el.remove()
    }
    return doc.body?.textContent ?? ""
  }, html)
}
