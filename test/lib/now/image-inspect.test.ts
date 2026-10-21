// @perspectives api-contract
// @routes /api/now
import { describe, expect, it } from "vitest"
import { ImageContentType, inspectImage } from "@/lib/now/image-inspect"

// ---- 試験用のバイト列を組み立てる ----

const encoder = new TextEncoder()

function bytesOf(...parts: (number[] | string)[]): Uint8Array {
  return Uint8Array.from(parts.flatMap((part) => (typeof part === "string" ? [...encoder.encode(part)] : part)))
}

function be32(value: number): number[] {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff]
}

function be16(value: number): number[] {
  return [(value >>> 8) & 0xff, value & 0xff]
}

function le16(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff]
}

function le24(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff]
}

function le32(value: number): number[] {
  return [...le16(value & 0xffff), ...le16(value >>> 16)]
}

function png(width: number, height: number): Uint8Array {
  return bytesOf([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], be32(13), "IHDR", be32(width), be32(height), [8, 6, 0, 0, 0], be32(0))
}

// APP0 (JFIF) のあとに SOF を置く。marker は 0xc0 (SOF0) か 0xc2 (SOF2)
function jpeg(width: number, height: number, marker = 0xc0): Uint8Array {
  const app0 = [0xff, 0xe0, ...be16(16), ...encoder.encode("JFIF"), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]
  const sof = [0xff, marker, ...be16(17), 8, ...be16(height), ...be16(width), 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]
  return bytesOf([0xff, 0xd8], app0, sof, [0xff, 0xd9])
}

function webp(chunk: string, payload: number[]): Uint8Array {
  return bytesOf("RIFF", le32(4 + 8 + payload.length), "WEBP", chunk, le32(payload.length), payload)
}

function webpVp8(width: number, height: number): Uint8Array {
  return webp("VP8 ", [0x30, 0x01, 0x00, 0x9d, 0x01, 0x2a, ...le16(width), ...le16(height), 0, 0])
}

function webpVp8l(width: number, height: number): Uint8Array {
  const bits = ((width - 1) | ((height - 1) << 14) | (1 << 28)) >>> 0
  return webp("VP8L", [0x2f, ...le32(bits), 0, 0, 0])
}

function webpVp8x(width: number, height: number): Uint8Array {
  return webp("VP8X", [0x10, 0, 0, 0, ...le24(width - 1), ...le24(height - 1)])
}

function svg(text: string): Uint8Array {
  return encoder.encode(text)
}

function svgDoc(inner: string, rootAttributes = 'width="10" height="10"'): Uint8Array {
  return svg(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ${rootAttributes}>${inner}</svg>`)
}

function base64(text: string): string {
  return btoa(String.fromCharCode(...encoder.encode(text)))
}

function reasonOf(name: string, bytes: Uint8Array): string {
  const result = inspectImage(name, bytes)
  if (result.ok) throw new Error(`ok:false のはずが ok:true でした: ${JSON.stringify(result)}`)
  return result.reason
}

// D2 が出す作り: XML 宣言、外側の <svg> (viewBox のみ) の中に内側の <svg> (幅・高さ)、
// CDATA の <style> に data: のフォント、data:image/svg+xml の <image>、url(#id) のマーカーとマスク
const d2Icon =
  '<?xml version="1.0" encoding="iso-8859-1"?>\n<!-- Generator: Adobe Illustrator 19.0.0 -->\n' +
  '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 58 58" style="enable-background:new 0 0 58 58;" xml:space="preserve">' +
  '<path style="fill:#7383BF;" d="M0,0L58,58"/></svg>'
const d2Like = [
  '<?xml version="1.0" encoding="utf-8"?>',
  '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" data-d2-version="v0.9.0" preserveAspectRatio="xMinYMin meet" viewBox="0 0 1352 2318">',
  '<svg class="d2-1 d2-svg" width="1352" height="2318" viewBox="-31 -31 1352 2318">',
  '<rect x="-31" y="-31" width="1352" height="2318" fill="#FFFFFF" class=" fill-N7" stroke-width="0" />',
  '<style type="text/css"><![CDATA[',
  '.d2-1 .text { font-family: "d2-1-font-regular"; }',
  '@font-face { font-family: d2-1-font-regular; src: url("data:application/font-woff;base64,d09GRgABAAAAABSwAAoAAAAAHuwAAg=="); }',
  ".d2-1 .fill-N7 { fill: #FFFFFF; } .d2-1 .md a { color: #0D32B2; }",
  "]]></style>",
  '<g class="shape"><image href="data:image/svg+xml;base64,' + base64(d2Icon) + '" x="0" y="0" width="58" height="58" /></g>',
  '<marker id="mk-d2-1" markerWidth="10" markerHeight="12" orient="auto"><polygon points="0,0 10,6 0,12" /></marker>',
  '<mask id="d2-1" maskUnits="userSpaceOnUse" x="-31" y="-31" width="1352" height="2318"><rect x="0" y="0" width="10" height="10" fill="white" /></mask>',
  '<path d="M0 0 L10 10" marker-end="url(#mk-d2-1)" mask="url(#d2-1)" />',
  '<text x="10" y="20" class="text fill-N1" style="text-anchor:middle;font-size:16px">MCP サーバー &amp; CLI</text>',
  "</svg></svg>",
].join("\n")

describe("inspectImage: 形式と幅・高さ", () => {
  it("PNG は IHDR から幅と高さを読む", () => {
    expect(inspectImage("a.png", png(640, 480))).toEqual({ ok: true, contentType: ImageContentType.png, width: 640, height: 480 })
  })

  it("JPEG は SOF0 と SOF2 (プログレッシブ) から幅と高さを読む", () => {
    expect(inspectImage("a.jpg", jpeg(800, 600))).toEqual({ ok: true, contentType: ImageContentType.jpeg, width: 800, height: 600 })
    expect(inspectImage("a.jpeg", jpeg(321, 123, 0xc2))).toEqual({ ok: true, contentType: ImageContentType.jpeg, width: 321, height: 123 })
  })

  it("WebP は VP8・VP8L・VP8X のヘッダから幅と高さを読む", () => {
    const expected = (width: number, height: number) => ({ ok: true, contentType: ImageContentType.webp, width, height })
    expect(inspectImage("a.webp", webpVp8(300, 200))).toEqual(expected(300, 200))
    expect(inspectImage("a.webp", webpVp8l(1000, 16383))).toEqual(expected(1000, 16383))
    expect(inspectImage("a.webp", webpVp8x(5000, 70000))).toEqual(expected(5000, 70000))
  })

  it("SVG は width・height 属性 (px 付き・小数は切り上げ) から読む", () => {
    expect(inspectImage("a.svg", svgDoc(""))).toEqual({ ok: true, contentType: ImageContentType.svg, width: 10, height: 10 })
    expect(inspectImage("a.svg", svgDoc("", 'width="120px" height="80.2"'))).toMatchObject({ ok: true, width: 120, height: 81 })
  })

  it("SVG に width・height が無ければ (または % なら) viewBox から読む", () => {
    expect(inspectImage("a.svg", svgDoc("", 'viewBox="0 0 300.5 150"'))).toMatchObject({ ok: true, width: 301, height: 150 })
    expect(inspectImage("a.svg", svgDoc("", 'width="100%" height="100%" viewBox="0,0,40,30"'))).toMatchObject({
      ok: true,
      width: 40,
      height: 30,
    })
  })

  it("SVG の先頭の BOM・空白・XML 宣言・コメント・DOCTYPE は飛ばして根の <svg> を見る", () => {
    const text =
      '﻿<?xml version="1.0"?>\n<!-- 説明 -->\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n<svg width="5" height="6"/>'
    expect(inspectImage("a.svg", svg(text))).toMatchObject({ ok: true, width: 5, height: 6 })
  })

  it("拡張子は大文字小文字を問わない", () => {
    expect(inspectImage("A.PNG", png(1, 1))).toMatchObject({ ok: true })
    expect(inspectImage("A.Jpg", jpeg(1, 1))).toMatchObject({ ok: true })
    expect(inspectImage("A.WebP", webpVp8x(1, 1))).toMatchObject({ ok: true })
    expect(inspectImage("A.SVG", svgDoc(""))).toMatchObject({ ok: true })
  })
})

describe("inspectImage: 拡張子と中身・壊れたヘッダ", () => {
  it("拡張子と中身が食い違えば断る", () => {
    expect(reasonOf("a.svg", png(1, 1))).toBe("拡張子 (.svg) と中身の形式 (PNG) が食い違っています")
    expect(reasonOf("a.png", jpeg(1, 1))).toContain("食い違っています")
    expect(reasonOf("a.jpg", webpVp8(1, 1))).toContain("(WebP)")
    expect(reasonOf("a.webp", svgDoc(""))).toContain("(SVG)")
  })

  it("許されていない拡張子は断る", () => {
    expect(reasonOf("a.gif", png(1, 1))).toContain("拡張子 (.gif) は許されていません")
    expect(reasonOf("noext", png(1, 1))).toContain("拡張子 (なし)")
  })

  it("知らない形式は断る", () => {
    expect(reasonOf("a.png", bytesOf("GIF89a", [1, 0, 1, 0]))).toContain("中身から判定できません")
    expect(reasonOf("a.svg", svg("<html><body></body></html>"))).toContain("中身から判定できません")
    expect(reasonOf("a.svg", svg("ただの文字"))).toContain("中身から判定できません")
  })

  it("壊れたヘッダや幅・高さが読めないものは断る", () => {
    expect(reasonOf("a.png", png(1, 1).subarray(0, 20))).toContain("PNG のヘッダから幅と高さを読めません")
    expect(reasonOf("a.png", png(0, 10))).toContain("PNG のヘッダから")
    expect(reasonOf("a.jpg", bytesOf([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xda, 0, 2]))).toContain("JPEG のヘッダから")
    expect(reasonOf("a.webp", webp("VP8 ", [0, 0, 0, 1, 2, 3, 0, 0, 0, 0]))).toContain("WebP のヘッダから")
    expect(reasonOf("a.webp", webp("ABCD", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toContain("WebP のヘッダから")
    expect(reasonOf("a.svg", svgDoc("", ""))).toContain("SVG の width・height (数か px) と viewBox のどちらからも幅と高さを読めません")
  })
})

describe("inspectImage: 危ない SVG を断る", () => {
  it.each([
    ["<script>", "<script>alert(1)</script>", "SVG に <script> が含まれています"],
    [
      "名前空間付きの script",
      '<html:script xmlns:html="http://www.w3.org/1999/xhtml">alert(1)</html:script>',
      "SVG に <html:script> が含まれています",
    ],
    ["<foreignObject>", "<foreignObject><div/></foreignObject>", "SVG に <foreignObject> が含まれています"],
    ["onload", '<rect onload="alert(1)" width="1" height="1"/>', "SVG に on で始まる属性 (onload) が含まれています"],
    ["onclick (単引用符)", "<g onClick='x()'/>", "SVG に on で始まる属性 (onClick) が含まれています"],
  ])("%s", (_, inner, reason) => {
    expect(reasonOf("a.svg", svgDoc(inner))).toBe(reason)
  })

  it("根の <svg> の on 属性も断る", () => {
    expect(reasonOf("a.svg", svgDoc("", 'width="1" height="1" onload="alert(1)"'))).toContain("on で始まる属性 (onload)")
  })

  it.each([
    ["href の https:", '<image href="https://example.com/a.png"/>'],
    ["href の http:", '<a href="http://example.com"><rect/></a>'],
    ["xlink:href の //", '<use xlink:href="//example.com/a.svg#x"/>'],
    ["xlink:href の相対パス", "<use xlink:href='other.svg#x'/>"],
    ["href の javascript:", '<a href="javascript:alert(1)"><rect/></a>'],
    ["文字参照で隠した http:", '<image href="&#x68;ttp://example.com/a.png"/>'],
  ])("外部を指す %s を断る", (_, inner) => {
    expect(reasonOf("a.svg", svgDoc(inner))).toMatch(/^SVG の (xlink:)?href 属性が外部を指しています/)
  })

  it.each([
    [
      "<style> の url(http…)",
      "<style>.a { fill: url(http://example.com/x.svg#p); }</style>",
      "SVG の CSS の url(...) が外部を指しています",
    ],
    ["<style> の url('https…')", "<style>.a { background: url('https://example.com/x.png'); }</style>", "が外部を指しています"],
    ["<style> の @import", '<style>@import "https://example.com/x.css";</style>', "SVG の CSS に @import が含まれています"],
    ["CDATA の中の @import", "<style><![CDATA[@import url(x.css);]]></style>", "SVG の CSS に @import が含まれています"],
    ["style 属性の url(http…)", '<rect style="fill: url(http://example.com/p)"/>', "SVG の CSS の url(...) が外部を指しています"],
    ["fill 属性の url(//…)", '<rect fill="url(//example.com/p)"/>', "SVG の CSS の url(...) が外部を指しています"],
    ["CSS のエスケープ", "<style>.a { fill: \\75 rl(http://example.com/p); }</style>", "SVG の CSS にエスケープ"],
  ])("%s を断る", (_, inner, reason) => {
    expect(reasonOf("a.svg", svgDoc(inner))).toContain(reason)
  })

  it("DOCTYPE に ENTITY があれば断る", () => {
    const text = '<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg width="1" height="1">&x;</svg>'
    expect(reasonOf("a.svg", svg(text))).toBe("SVG の DOCTYPE に ENTITY が含まれています")
  })

  it("XML 宣言以外の処理命令 (xml-stylesheet) を断る", () => {
    const text = '<?xml version="1.0"?><?xml-stylesheet href="https://example.com/x.css"?><svg width="1" height="1"/>'
    expect(reasonOf("a.svg", svg(text))).toContain("処理命令")
  })

  it("<set>・<animate> で href を書き換えるものを断る", () => {
    expect(reasonOf("a.svg", svgDoc('<a><set attributeName="href" to="javascript:alert(1)"/></a>'))).toContain("href を書き換えています")
  })

  it("CDATA の中の <!-- でコメントに見せかけて script を隠しても断る", () => {
    expect(reasonOf("a.svg", svgDoc("<style><![CDATA[ <!-- ]]></style><script>alert(1)</script><!-- -->"))).toBe(
      "SVG に <script> が含まれています",
    )
  })

  it("<style> の中のタグを断る", () => {
    expect(reasonOf("a.svg", svgDoc("<style><script>alert(1)</script></style>"))).toContain("<style> の中にタグ")
  })

  it("埋め込みの data:image/svg+xml (base64) の中の script を断る", () => {
    const inner = base64('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
    expect(reasonOf("a.svg", svgDoc(`<image href="data:image/svg+xml;base64,${inner}"/>`))).toBe(
      "埋め込みの SVG: SVG に <script> が含まれています",
    )
  })

  it("埋め込みの data:image/svg+xml (URL エンコード) の中の外部参照を断る", () => {
    const inner = encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.com/a.png"/></svg>')
    expect(reasonOf("a.svg", svgDoc(`<image href="data:image/svg+xml,${inner}"/>`))).toMatch(
      /^埋め込みの SVG: SVG の href 属性が外部を指しています/,
    )
  })

  it("CSS の url() の中の埋め込み SVG も中まで調べる", () => {
    const inner = base64('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>')
    expect(reasonOf("a.svg", svgDoc(`<style>.a { fill: url("data:image/svg+xml;base64,${inner}"); }</style>`))).toContain(
      "埋め込みの SVG: SVG に on で始まる属性",
    )
  })

  it("文書として開ける data: (text/html) は断る", () => {
    expect(reasonOf("a.svg", svgDoc('<a href="data:text/html,&lt;script&gt;alert(1)&lt;/script&gt;"><rect/></a>'))).toContain(
      "data: の種類 (text/html) は許されていません",
    )
  })
})

describe("inspectImage: 通してよい SVG", () => {
  it("#id への href・url(#id)・data: の埋め込み画像は通す", () => {
    const inner = [
      '<defs><linearGradient id="g"/><path id="p" d="M0 0"/></defs>',
      '<use href="#p"/><use xlink:href="#p"/>',
      '<rect fill="url(#g)" style="stroke: url(&quot;#g&quot;)"/>',
      '<image href="data:image/png;base64,iVBORw0KGgo=" width="1" height="1"/>',
      "<style>.a { fill: url('#g'); }</style>",
    ].join("")
    expect(inspectImage("a.svg", svgDoc(inner))).toMatchObject({ ok: true })
  })

  it("中身が安全な埋め込みの data:image/svg+xml (base64・URL エンコード) は通す", () => {
    const safe = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect fill="url(#a)"/></svg>'
    const inner = `<image href="data:image/svg+xml;base64,${base64(safe)}"/><image href="data:image/svg+xml;charset=utf-8,${encodeURIComponent(safe)}"/>`
    expect(inspectImage("a.svg", svgDoc(inner))).toMatchObject({ ok: true })
  })

  it("D2 が出す作りの SVG は通り、外側の viewBox から幅と高さを読む", () => {
    expect(inspectImage("architecture-light.svg", svg(d2Like))).toEqual({
      ok: true,
      contentType: ImageContentType.svg,
      width: 1352,
      height: 2318,
    })
  })
})
