// @perspectives content interaction
// @routes /now/[id]
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Markdown } from "@/components/common/markdown"
import { ja } from "@/data/messages/ja"
import type { NowPostImage } from "@/lib/now/schema"

// 辞書の Context (useMessages) は Provider を包まず、既定の言語 (ja) の文言で確かめる
function image(name: string, url: string, width: number, height: number): NowPostImage {
  return { name, url, width, height, contentType: "image/svg+xml", bytes: 100, sha256: "0".repeat(64) }
}

const images: NowPostImage[] = [
  image("photo.png", "https://blob.example/now/a/photo.png", 800, 600),
  image("arch-light.svg", "https://blob.example/now/a/arch-light.svg", 1200, 2400),
  image("arch-dark.svg", "https://blob.example/now/a/arch-dark.svg", 1200, 2400),
]

function render(body: string, options: { images?: NowPostImage[] } = {}): string {
  return renderToStaticMarkup(
    <Markdown headingStart={2} images={options.images} imageViewerTitle="記事の題 の画像">
      {body}
    </Markdown>,
  )
}

function imgTags(html: string): string[] {
  return html.match(/<img [^>]*>/g) ?? []
}

describe("Markdown の画像", () => {
  it("対応表にある画像を、表の url・alt・幅・高さ・lazy・async 付きの <img> で出す", () => {
    const html = render("![写真の説明](assets/photo.png)", { images })
    const tags = imgTags(html)
    expect(tags).toHaveLength(1)
    const tag = tags[0] ?? ""
    expect(tag).toContain('src="https://blob.example/now/a/photo.png"')
    expect(tag).toContain('alt="写真の説明"')
    expect(tag).toContain('width="800"')
    expect(tag).toContain('height="600"')
    expect(tag).toContain('loading="lazy"')
    expect(tag).toContain('decoding="async"')
    // 本文の幅まで縮め、高さは比率で決める
    expect(tag).toMatch(/class="[^"]*\bmax-w-full\b[^"]*"/)
    expect(tag).toMatch(/class="[^"]*\bh-auto\b[^"]*"/)
  })

  it("組の画像はライト用に dark:hidden、ダーク用に hidden dark:block を付けて 2 枚出す", () => {
    const html = render("![構成図](assets/arch-light.svg)", { images })
    const tags = imgTags(html)
    expect(tags).toHaveLength(2)
    const [light = "", dark = ""] = tags
    expect(light).toContain('src="https://blob.example/now/a/arch-light.svg"')
    expect(light).toMatch(/class="[^"]*\bdark:hidden\b[^"]*"/)
    expect(light).not.toMatch(/class="[^"]*\bdark:block\b/)
    expect(dark).toContain('src="https://blob.example/now/a/arch-dark.svg"')
    expect(dark).toMatch(/class="hidden [^"]*\bdark:block\b[^"]*"|class="[^"]*\bhidden\b[^"]*\bdark:block\b[^"]*"/)
  })

  it("画像は「画像を拡大する: <代替テキスト>」の名前の button で、下に拡大の案内が出る", () => {
    const html = render("![構成図](assets/arch-light.svg)", { images })
    expect(html).toMatch(new RegExp(`<button type="button" aria-label="${ja.imageViewer.enlargeImage}: 構成図"`))
    expect(html).toContain(ja.imageViewer.enlargeHint)
    // 閉じている間は拡大表示を描かない
    expect(html).not.toContain('role="dialog"')
  })

  it("対応表に無い画像は <img> にせず、代替テキストの文字を出す", () => {
    const html = render("![無い画像](assets/missing.png)", { images })
    expect(imgTags(html)).toHaveLength(0)
    expect(html).toContain("無い画像")
    expect(html).not.toContain("<button")
  })

  it("外部の画像も <img> にしない", () => {
    const html = render("![外部](https://example.com/photo.png)", { images })
    expect(imgTags(html)).toHaveLength(0)
    expect(html).toContain("外部")
  })

  it("images を渡さない呼び出しでは、画像はすべて代替テキストの文字になる", () => {
    const html = render("![写真の説明](assets/photo.png)\n\n文と ![構成図](assets/arch-light.svg) の段落")
    expect(imgTags(html)).toHaveLength(0)
    expect(html).toContain("写真の説明")
    expect(html).toContain("構成図")
    expect(html).not.toContain("<figure")
  })

  it("画像だけの段落は <p> ではなく <figure> にし、<p> の中に <figure> や <div> を入れない", () => {
    const html = render("前の文\n\n![写真の説明](assets/photo.png)\n\n後の文", { images })
    expect(html).toMatch(/<figure[^>]*>[\s\S]*<img [^>]*photo\.png[\s\S]*<\/figure>/)
    expect(html).not.toMatch(/<p>(?:(?!<\/p>)[\s\S])*<(?:figure|div)\b/)
    expect(html).toContain("<p>前の文</p>")
    expect(html).toContain("<p>後の文</p>")
  })

  it("文と画像が混ざった段落は <p> のまま (中にブロックの要素を入れない)", () => {
    const html = render("説明の文 ![写真の説明](assets/photo.png) の続き", { images })
    expect(html).not.toContain("<figure")
    expect(html).toMatch(/<p>説明の文 [\s\S]*<img [^>]*photo\.png[\s\S]*の続き<\/p>/)
    expect(html).not.toMatch(/<p>(?:(?!<\/p>)[\s\S])*<(?:figure|div)\b/)
  })
})
