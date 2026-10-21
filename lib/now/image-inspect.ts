// /now の記事の画像の中身を調べる純関数 (docs/specs/now-post-images.md の「画像の中身の検査」)
// 拡張子ではなく先頭のバイトで形式を判定し、幅と高さを読み、危ない SVG を断る。
// 中身を書き換えて無害にはしない (断るだけ)。依存パッケージを足さないため、XML は自前の小さな走査で読む
export const ImageContentType = {
  svg: "image/svg+xml",
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
} as const
export type ImageContentType = (typeof ImageContentType)[keyof typeof ImageContentType]

export type ImageInspection = { ok: true; contentType: ImageContentType; width: number; height: number } | { ok: false; reason: string }

type Size = { width: number; height: number }

// 許す拡張子と、その拡張子が名乗る形式。大文字小文字は問わない
const contentTypeByExtension: Record<string, ImageContentType> = {
  ".svg": ImageContentType.svg,
  ".png": ImageContentType.png,
  ".jpg": ImageContentType.jpeg,
  ".jpeg": ImageContentType.jpeg,
  ".webp": ImageContentType.webp,
}

// 理由の文字列に出す形式の名前
const formatLabel: Record<ImageContentType, string> = {
  [ImageContentType.svg]: "SVG",
  [ImageContentType.png]: "PNG",
  [ImageContentType.jpeg]: "JPEG",
  [ImageContentType.webp]: "WebP",
}

export function inspectImage(name: string, bytes: Uint8Array): ImageInspection {
  const dot = name.lastIndexOf(".")
  const extension = dot >= 0 ? name.slice(dot).toLowerCase() : ""
  const expected = contentTypeByExtension[extension]
  if (!expected) return reject(`ファイル名の拡張子 (${extension || "なし"}) は許されていません (.svg・.png・.jpg・.jpeg・.webp のどれか)`)
  const actual = detectContentType(bytes)
  if (!actual) return reject("画像の形式を中身から判定できません (SVG・PNG・JPEG・WebP のどれでもありません)")
  if (actual !== expected) return reject(`拡張子 (${extension}) と中身の形式 (${formatLabel[actual]}) が食い違っています`)
  return actual === ImageContentType.svg ? inspectSvg(bytes) : measureBinary(actual, bytes)
}

function reject(reason: string): ImageInspection {
  return { ok: false, reason }
}

// 幅と高さを正の整数に丸める (切り上げ)。読めなければ null
function toSize(width: number, height: number): Size | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null
  return { width: Math.ceil(width), height: Math.ceil(height) }
}

function withSize(contentType: ImageContentType, size: Size | null): ImageInspection {
  if (!size) return reject(`${formatLabel[contentType]} のヘッダから幅と高さを読めません (壊れている可能性があります)`)
  return { ok: true, contentType, ...size }
}

// ---- 形式の判定 ----

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  return signature.every((value, index) => bytes[offset + index] === value)
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.subarray(start, end))
}

const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const
const jpegSignature = [0xff, 0xd8, 0xff] as const

function detectContentType(bytes: Uint8Array): ImageContentType | null {
  if (startsWith(bytes, pngSignature)) return ImageContentType.png
  if (startsWith(bytes, jpegSignature)) return ImageContentType.jpeg
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return ImageContentType.webp
  const text = decodeSvgText(bytes)
  return text !== null && looksLikeSvg(text) ? ImageContentType.svg : null
}

// ---- PNG・JPEG・WebP の幅と高さ ----

function measureBinary(contentType: ImageContentType, bytes: Uint8Array): ImageInspection {
  const measure = contentType === ImageContentType.png ? readPngSize : contentType === ImageContentType.jpeg ? readJpegSize : readWebpSize
  return withSize(contentType, measure(bytes))
}

function u16be(bytes: Uint8Array, at: number): number {
  return ((bytes[at] ?? 0) << 8) | (bytes[at + 1] ?? 0)
}

function u16le(bytes: Uint8Array, at: number): number {
  return (bytes[at] ?? 0) | ((bytes[at + 1] ?? 0) << 8)
}

function u24le(bytes: Uint8Array, at: number): number {
  return u16le(bytes, at) | ((bytes[at + 2] ?? 0) << 16)
}

function u32be(bytes: Uint8Array, at: number): number {
  return u16be(bytes, at) * 0x10000 + u16be(bytes, at + 2)
}

// PNG は署名の直後が IHDR のチャンクで、幅と高さが 4 バイトずつ (ビッグエンディアン) 入る
function readPngSize(bytes: Uint8Array): Size | null {
  if (bytes.length < 24 || ascii(bytes, 12, 16) !== "IHDR") return null
  return toSize(u32be(bytes, 16), u32be(bytes, 20))
}

// SOF (フレームの始まり) のマーカー。C4 (DHT)・C8 (予約)・CC (DAC) は SOF ではない
function isSofMarker(marker: number): boolean {
  return marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
}

// 長さを持たない単独のマーカー (TEM と RST0〜7・SOI)
function isStandaloneMarker(marker: number): boolean {
  return marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)
}

// JPEG はセグメントを順にたどり、最初の SOF から高さ・幅を読む。画像データ (SOS) や終わり (EOI) に先に着いたら壊れている
function readJpegSize(bytes: Uint8Array): Size | null {
  let at = 2
  while (at + 3 < bytes.length) {
    const next = readJpegSegment(bytes, at)
    if (typeof next !== "number") return next
    at = next
  }
  return null
}

// at のセグメントを読み、次のセグメントの位置か、SOF から読めた大きさを返す。壊れていれば null
function readJpegSegment(bytes: Uint8Array, at: number): number | Size | null {
  if (bytes[at] !== 0xff) return null
  const marker = bytes[at + 1] ?? 0
  if (marker === 0xff) return at + 1 // 埋め草の 0xFF
  if (isStandaloneMarker(marker)) return at + 2
  if (isSofMarker(marker)) return at + 8 < bytes.length ? toSize(u16be(bytes, at + 7), u16be(bytes, at + 5)) : null
  const length = u16be(bytes, at + 2)
  return marker === 0xda || marker === 0xd9 || length < 2 ? null : at + 2 + length
}

// WebP は RIFF の最初のチャンクで作りが分かれる (非可逆の VP8・可逆の VP8L・拡張の VP8X)
const webpReaders: Record<string, (bytes: Uint8Array) => Size | null> = {
  "VP8 ": (bytes) => {
    if (bytes.length < 30 || !startsWith(bytes, [0x9d, 0x01, 0x2a], 23)) return null
    return toSize(u16le(bytes, 26) & 0x3fff, u16le(bytes, 28) & 0x3fff)
  },
  VP8L: (bytes) => {
    if (bytes.length < 25 || bytes[20] !== 0x2f) return null
    const bits = (u16le(bytes, 21) | (u16le(bytes, 23) << 16)) >>> 0
    return toSize((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1)
  },
  VP8X: (bytes) => (bytes.length < 30 ? null : toSize(u24le(bytes, 24) + 1, u24le(bytes, 27) + 1)),
}

function readWebpSize(bytes: Uint8Array): Size | null {
  if (bytes.length < 16) return null
  const reader = webpReaders[ascii(bytes, 12, 16)]
  return reader ? reader(bytes) : null
}

// ---- SVG の文字列 ----

const utf8Encodings = new Set(["utf-8", "utf8"])
const latinEncodings = new Set(["iso-8859-1", "latin1", "windows-1252", "us-ascii", "ascii"])

// XML 宣言の encoding に従って文字列にする。UTF-8 と Latin-1 系だけを扱い、それ以外や壊れた UTF-8 は null
function decodeSvgText(bytes: Uint8Array): string | null {
  const head = new TextDecoder("windows-1252").decode(bytes.subarray(0, 256))
  const declared = /^(?:ï»¿)?<\?xml\s[^>]*?encoding\s*=\s*["']([^"']+)["']/i.exec(head)?.[1]?.toLowerCase() ?? "utf-8"
  if (latinEncodings.has(declared)) return new TextDecoder("windows-1252").decode(bytes)
  if (!utf8Encodings.has(declared)) return null
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch {
    return null
  }
}

// 先頭の BOM・空白・XML 宣言・コメント・DOCTYPE の後の最初の要素が <svg なら SVG とみなす
// (XML 宣言以外の処理命令もここでは飛ばし、断る理由は検査の側で出す)
function looksLikeSvg(text: string): boolean {
  const skippable = /\s+|<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<!DOCTYPE\b(?:[^[>]|\[[^\]]*\])*>/iy
  let at = text.startsWith("\uFEFF") ? 1 : 0
  for (;;) {
    skippable.lastIndex = at
    if (!skippable.exec(text)) break
    at = skippable.lastIndex
  }
  const root = /<svg[\s/>]/y
  root.lastIndex = at
  return root.test(text)
}

// ---- SVG の検査 ----

// 検査に当たったら投げる。理由は日本語で、どの検査に当たったかを書く
class SvgRejection extends Error {}

// 埋め込みの data:image/svg+xml の入れ子の深さの上限 (D2 は 1 段)
const maxEmbedDepth = 3

// 中に置かれると、スクリプトや外部の文書を読み込める要素 (名前空間の接頭辞は外して小文字で比べる)
const forbiddenElements = new Set(["script", "foreignobject", "iframe", "embed", "object", "handler", "listener"])

function inspectSvg(bytes: Uint8Array): ImageInspection {
  const text = decodeSvgText(bytes)
  if (text === null) return reject("SVG の文字コードを読めません (UTF-8 か Latin-1 のみ)")
  try {
    const size = svgSize(new SvgScanner(text, 0).run())
    if (!size) return reject("SVG の width・height (数か px) と viewBox のどちらからも幅と高さを読めません")
    return { ok: true, contentType: ImageContentType.svg, ...size }
  } catch (error) {
    if (error instanceof SvgRejection) return reject(error.message)
    throw error
  }
}

function localName(name: string): string {
  return name.slice(name.lastIndexOf(":") + 1).toLowerCase()
}

function shorten(value: string): string {
  return value.length > 60 ? `${value.slice(0, 60)}…` : value
}

// XML の文字参照と定義済みの 5 つの実体を戻す (属性の値はブラウザが戻してから使うため、戻してから調べる)
const namedEntities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }

function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos);/gi, (_, entity: string) => {
    if (!entity.startsWith("#")) return namedEntities[entity.toLowerCase()] ?? ""
    const code = entity[1] === "x" || entity[1] === "X" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10)
    return code <= 0x10ffff ? String.fromCodePoint(code) : "�"
  })
}

type StartTag = { name: string; attributes: [string, string][]; selfClosing: boolean; end: number }

// 開始タグを読む。XML なので属性の値は必ず引用符 (" か ') で囲まれる。読めなければ null
function parseStartTag(text: string, at: number): StartTag | null {
  const nameMatch = /<([A-Za-z_][\w:.-]*)/y
  nameMatch.lastIndex = at
  const name = nameMatch.exec(text)?.[1]
  if (!name) return null
  const attribute = /\s+([^\s=/>"']+)\s*=\s*(?:"([^"]*)"|'([^']*)')/y
  const close = /\s*(\/?)>/y
  const attributes: [string, string][] = []
  let position = nameMatch.lastIndex
  for (;;) {
    close.lastIndex = position
    const closed = close.exec(text)
    if (closed) return { name, attributes, selfClosing: closed[1] === "/", end: close.lastIndex }
    attribute.lastIndex = position
    const found = attribute.exec(text)
    if (!found?.[1]) return null
    attributes.push([found[1], found[2] ?? found[3] ?? ""])
    position = attribute.lastIndex
  }
}

// 文書を先頭から字句に分けて調べる。コメント・CDATA・DOCTYPE・処理命令・タグを出てきた順に読むので、
// CDATA の中の "<!--" のようにほかの字句に見える文字で検査を飛ばされることがない
class SvgScanner {
  private at: number
  private root: Map<string, string> | null = null
  private css: string | null = null

  constructor(
    private readonly text: string,
    private readonly depth: number,
  ) {
    this.at = text.startsWith("\uFEFF") ? 1 : 0
  }

  // 根の <svg> の属性 (実体を戻した値) を返す
  run(): Map<string, string> {
    for (;;) {
      const next = this.text.indexOf("<", this.at)
      this.characters(this.text.slice(this.at, next < 0 ? undefined : next))
      if (next < 0) break
      this.at = next
      this.token()
    }
    if (this.css !== null) throw new SvgRejection("SVG の <style> が閉じられていません")
    if (!this.root) throw new SvgRejection("SVG の根の要素がありません")
    return this.root
  }

  private characters(chunk: string): void {
    if (this.css !== null) this.css += decodeEntities(chunk)
    else if (!this.root && chunk.trim() !== "") throw new SvgRejection("SVG の根の要素の前に文字があります")
  }

  private token(): void {
    const startsWith = (prefix: string) => this.text.startsWith(prefix, this.at)
    if (startsWith("<!--")) this.at = this.endOf("-->", "コメント")
    else if (startsWith("<![CDATA[")) this.cdata()
    else if (startsWith("<!")) this.doctype()
    else if (startsWith("<?")) this.processingInstruction()
    else if (startsWith("</")) this.endTag()
    else this.startTag()
  }

  private endOf(terminator: string, label: string): number {
    const end = this.text.indexOf(terminator, this.at)
    if (end < 0) throw new SvgRejection(`SVG の${label}が閉じられていません`)
    return end + terminator.length
  }

  private cdata(): void {
    const end = this.endOf("]]>", " CDATA ")
    if (this.css !== null) this.css += this.text.slice(this.at + "<![CDATA[".length, end - 3)
    this.at = end
  }

  // DOCTYPE の中の ENTITY は外部実体の参照に使えるので断る
  private doctype(): void {
    const doctype = /<!DOCTYPE\b(?:[^[>]|\[[^\]]*\])*>/iy
    doctype.lastIndex = this.at
    const found = doctype.exec(this.text)
    if (!found || this.root) throw new SvgRejection("SVG の DOCTYPE を読めません")
    if (/<!ENTITY/i.test(found[0])) throw new SvgRejection("SVG の DOCTYPE に ENTITY が含まれています")
    this.at = doctype.lastIndex
  }

  // 許す処理命令は文書の先頭の XML 宣言だけ (<?xml-stylesheet?> は外部の CSS を読めるため断る)
  private processingInstruction(): void {
    const start = this.text.startsWith("\uFEFF") ? 1 : 0
    if (this.at !== start || !/^<\?xml\s/.test(this.text.slice(this.at, this.at + 6))) {
      throw new SvgRejection("SVG に XML 宣言以外の処理命令 (<?…?>) が含まれています")
    }
    this.at = this.endOf("?>", " XML 宣言")
  }

  private endTag(): void {
    const endTag = /<\/([^\s>]+)\s*>/y
    endTag.lastIndex = this.at
    const name = endTag.exec(this.text)?.[1]
    if (!name) throw new SvgRejection("SVG の閉じタグを読めません")
    if (this.css !== null && localName(name) === "style") {
      checkStyleSheet(this.css, this.depth)
      this.css = null
    }
    this.at = endTag.lastIndex
  }

  private startTag(): void {
    const tag = parseStartTag(this.text, this.at)
    if (!tag) throw new SvgRejection("SVG のタグを読めません")
    if (this.css !== null) throw new SvgRejection("SVG の <style> の中にタグが含まれています")
    if (!this.root) {
      if (tag.name !== "svg") throw new SvgRejection("SVG の根の要素が <svg> ではありません")
      this.root = new Map(tag.attributes.map(([name, value]) => [name, decodeEntities(value)]))
    }
    checkElement(tag, this.depth)
    if (localName(tag.name) === "style" && !tag.selfClosing) this.css = ""
    this.at = tag.end
  }
}

function checkElement(tag: StartTag, depth: number): void {
  const local = localName(tag.name)
  if (forbiddenElements.has(local)) throw new SvgRejection(`SVG に <${tag.name}> が含まれています`)
  for (const [name, value] of tag.attributes) checkAttribute(name, value, depth)
  // <set>・<animate> で href を書き換えれば、属性の検査を通ったあとで外部を指せてしまう
  const animated = tag.attributes.find(([name]) => localName(name) === "attributename")?.[1] ?? ""
  if ((local === "set" || local === "animate") && localName(animated.trim()) === "href") {
    throw new SvgRejection(`SVG の <${tag.name}> が href を書き換えています`)
  }
}

function checkAttribute(name: string, raw: string, depth: number): void {
  const local = localName(name)
  if (local.startsWith("on")) throw new SvgRejection(`SVG に on で始まる属性 (${name}) が含まれています`)
  const value = decodeEntities(raw)
  // href・src は値そのものが参照 (data: の SVG は中まで調べるので、URL エンコードされた中身を url(...) としては見ない)
  if (local === "href" || local === "src") checkReference(value, depth, `SVG の ${name} 属性`)
  // style 属性は CSS として、ほかの属性 (fill・mask など) も url(...) を調べる
  else if (name.toLowerCase() === "style") checkStyleSheet(value, depth)
  else checkCssUrls(value, depth)
}

// 参照してよいのは、同じ文書の中の #id と、埋め込みの data: だけ
function checkReference(value: string, depth: number, label: string): void {
  const reference = value.trim()
  if (reference.startsWith("#")) return
  if (/^data:/i.test(reference)) {
    checkDataUrl(reference, depth, label)
    return
  }
  throw new SvgRejection(`${label}が外部を指しています (${shorten(reference) || "空"})`)
}

// data: のうち、文書として開ける種類 (HTML・XML・スクリプト) は断る。SVG は中まで同じ検査をかける
function checkDataUrl(url: string, depth: number, label: string): void {
  const comma = url.indexOf(",")
  if (comma < 0) throw new SvgRejection(`${label}の data: URL を読めません`)
  const parameters = url.slice("data:".length, comma).toLowerCase().split(";")
  const mediaType = parameters[0]?.trim() ?? ""
  if (mediaType === ImageContentType.svg) checkEmbeddedSvg(url.slice(comma + 1), parameters.includes("base64"), depth, label)
  else if (/html|xml|script/.test(mediaType)) throw new SvgRejection(`${label}の data: の種類 (${mediaType}) は許されていません`)
}

function decodeDataPayload(payload: string, base64: boolean): string | null {
  try {
    const decoded = decodeURIComponent(payload)
    if (!base64) return decoded
    const binary = atob(decoded.replace(/\s+/g, ""))
    return decodeSvgText(Uint8Array.from(binary, (char) => char.charCodeAt(0)))
  } catch {
    return null
  }
}

function checkEmbeddedSvg(payload: string, base64: boolean, depth: number, label: string): void {
  if (depth + 1 > maxEmbedDepth) throw new SvgRejection(`${label}の埋め込みの SVG の入れ子が深すぎます`)
  const text = decodeDataPayload(payload, base64)
  if (text === null) throw new SvgRejection(`${label}の埋め込みの SVG を読めません`)
  try {
    new SvgScanner(text, depth + 1).run()
  } catch (error) {
    if (error instanceof SvgRejection) throw new SvgRejection(`埋め込みの SVG: ${error.message}`)
    throw error
  }
}

// <style> と style 属性の CSS。@import と image-set() は外部を読めるので断る。
// CSS のエスケープ (\75 rl( のような書き方) で検査を逃れられないよう、バックスラッシュも断る
function checkStyleSheet(css: string, depth: number): void {
  const code = css.replace(/\/\*[\s\S]*?\*\//g, " ")
  if (/@import/i.test(code)) throw new SvgRejection("SVG の CSS に @import が含まれています")
  if (code.includes("\\")) throw new SvgRejection("SVG の CSS にエスケープ (\\) が含まれています")
  if (/image-set\s*\(/i.test(code)) throw new SvgRejection("SVG の CSS に image-set() が含まれています")
  checkCssUrls(code, depth)
}

function checkCssUrls(css: string, depth: number): void {
  const opening = /url\(/gi
  const argument = /\s*(?:"([^"]*)"|'([^']*)'|([^)"'\s]*))\s*\)/y
  for (let found = opening.exec(css); found; found = opening.exec(css)) {
    argument.lastIndex = opening.lastIndex
    const parsed = argument.exec(css)
    if (!parsed) throw new SvgRejection("SVG の CSS の url(...) を読めません")
    checkReference(parsed[1] ?? parsed[2] ?? parsed[3] ?? "", depth, "SVG の CSS の url(...) ")
  }
}

// ---- SVG の幅と高さ ----

// width・height は数だけか px 付き (小数も)。% や mm などは読まずに viewBox に回す
function parseLength(value: string | undefined): number | null {
  const match = /^\s*((?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*(?:px)?\s*$/i.exec(value ?? "")
  return match?.[1] ? Number(match[1]) : null
}

function svgSize(root: Map<string, string>): Size | null {
  const width = parseLength(root.get("width"))
  const height = parseLength(root.get("height"))
  if (width !== null && height !== null) return toSize(width, height)
  const viewBox = (root.get("viewBox") ?? "").trim().split(/[\s,]+/)
  if (viewBox.length !== 4) return null
  return toSize(Number(viewBox[2]), Number(viewBox[3]))
}
