import { createHash } from "node:crypto"
import remarkGfm from "remark-gfm"
import remarkParse from "remark-parse"
import { unified } from "unified"
import { visit } from "unist-util-visit"
import { type ImageContentType, inspectImage } from "@/lib/now/image-inspect"
import { darkPairName, imageFileNameOf, isExternalImageSrc } from "@/lib/now/post-image-lookup"
import type { NowPostImage } from "@/lib/now/schema"

// 記事の本文が参照する画像と、送られたファイルと、元の記事の対応表から、置く・残す・消す画像を決める (docs/specs/now-post-images.md)。
// サーバーでだけ使う (sha256 に node:crypto を使う)。クライアントからも使う imageLookup・darkPairName は post-image-lookup.ts に置き、ここから re-export する
export { darkPairName, imageLookup } from "@/lib/now/post-image-lookup"

// 1 枚の上限。Vercel の関数の 4.5MB の上限に、リクエスト全体で収まるようにする
export const maxImageBytes = 1024 * 1024
export const maxImagesPerPost = 20
// リクエスト全体の上限 (超えたら 413。投稿 API が Content-Length で先に見る)
export const maxRequestBytes = 4 * 1024 * 1024

// 送られたファイル名に許す文字 (URL のパスにそのまま使うため)
const fileNamePattern = /^[A-Za-z0-9._-]+$/

export const PostImageIssueCode = {
  missing: "missing",
  duplicate: "duplicate",
  unused: "unused",
  external: "external",
  alt: "alt",
  name: "name",
  invalid: "invalid",
  tooLarge: "too-large",
  tooMany: "too-many",
} as const
export type PostImageIssueCode = (typeof PostImageIssueCode)[keyof typeof PostImageIssueCode]

export type PostImageIssue = { code: PostImageIssueCode; name?: string; message: string }

export type ImageRef = { src: string; alt: string }

export type ImageUpload = { name: string; bytes: Uint8Array }

export type PlannedPut = { name: string; bytes: Uint8Array; sha256: string; contentType: ImageContentType; width: number; height: number }

export type PostImagePlan =
  { ok: true; puts: PlannedPut[]; kept: NowPostImage[]; removed: NowPostImage[] } | { ok: false; issues: PostImageIssue[] }

// 本文 (Markdown、GFM) が参照する画像を出てきた順に返す。![a](src) と参照形式の ![a][r] を拾う。
// コードブロックとインラインコードの中は構文木で画像にならないので拾わない
export function imageRefsOf(markdown: string): ImageRef[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown)
  const definitions = new Map<string, string>()
  visit(tree, "definition", (node) => {
    // 同じ識別子の定義が複数あれば、CommonMark と同じく最初のものを使う
    if (!definitions.has(node.identifier)) definitions.set(node.identifier, node.url)
  })
  const refs: ImageRef[] = []
  visit(tree, (node) => {
    if (node.type === "image") refs.push({ src: node.url, alt: node.alt ?? "" })
    else if (node.type === "imageReference") {
      const url = definitions.get(node.identifier)
      // 定義の無い参照は Markdown では画像にならない (文字のまま)
      if (url !== undefined) refs.push({ src: url, alt: node.alt ?? "" })
    }
  })
  return refs
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex")
}

type InspectedUpload = { name: string; bytes: Uint8Array; contentType: ImageContentType; width: number; height: number }

// 本文の参照を調べ、参照されている (外部でない・名前の正しい) ファイル名を出てきた順に返す
function referencedNames(body: string, issues: PostImageIssue[]): string[] {
  const names = new Set<string>()
  for (const ref of imageRefsOf(body)) {
    const label = ref.src.trim() || "(空)"
    if (ref.alt.trim() === "") issues.push({ code: PostImageIssueCode.alt, name: label, message: `画像 ${label} の代替テキストが空です` })
    if (isExternalImageSrc(ref.src)) {
      issues.push({
        code: PostImageIssueCode.external,
        name: label,
        message: `外部の画像 (${label}) は使えません。送ったファイルを相対パスで参照してください`,
      })
      continue
    }
    const name = imageFileNameOf(ref.src)
    if (!fileNamePattern.test(name)) {
      issues.push({
        code: PostImageIssueCode.name,
        name: name || label,
        message: `本文の画像のファイル名 (${name || label}) は英数字・-・_・. だけにしてください`,
      })
      continue
    }
    names.add(name)
  }
  return [...names]
}

// 送られたファイルを調べ、問題の無いものを名前で引ける形にする
function inspectUploads(uploads: ImageUpload[], issues: PostImageIssue[]): { names: Set<string>; inspected: Map<string, InspectedUpload> } {
  if (uploads.length > maxImagesPerPost) {
    issues.push({
      code: PostImageIssueCode.tooMany,
      message: `画像は 1 回に ${maxImagesPerPost} 枚までです (${uploads.length} 枚送られました)`,
    })
  }
  // 重複した名前は最初の 1 つだけを調べる (問題は duplicate で返す)
  const firstByName = new Map<string, ImageUpload>()
  const counts = new Map<string, number>()
  for (const upload of uploads) {
    counts.set(upload.name, (counts.get(upload.name) ?? 0) + 1)
    if (!firstByName.has(upload.name)) firstByName.set(upload.name, upload)
  }
  for (const [name, count] of counts) {
    if (count > 1)
      issues.push({ code: PostImageIssueCode.duplicate, name, message: `同じファイル名 (${name}) の画像が ${count} つ送られました` })
  }
  const inspected = new Map<string, InspectedUpload>()
  for (const upload of firstByName.values()) {
    const result = inspectUpload(upload)
    if ("code" in result) issues.push(result)
    else inspected.set(upload.name, result)
  }
  return { names: new Set(firstByName.keys()), inspected }
}

// 1 枚のファイルの名前・大きさ・中身を調べる
function inspectUpload({ name, bytes }: ImageUpload): InspectedUpload | PostImageIssue {
  if (!fileNamePattern.test(name)) {
    return { code: PostImageIssueCode.name, name, message: `ファイル名 (${name}) は英数字・-・_・. だけにしてください` }
  }
  if (bytes.length > maxImageBytes) {
    return {
      code: PostImageIssueCode.tooLarge,
      name,
      message: `画像 ${name} は ${bytes.length} バイトで、1 枚の上限 (${maxImageBytes} バイト) を超えています`,
    }
  }
  const inspection = inspectImage(name, bytes)
  if (!inspection.ok) return { code: PostImageIssueCode.invalid, name, message: `画像 ${name}: ${inspection.reason}` }
  return { name, bytes, contentType: inspection.contentType, width: inspection.width, height: inspection.height }
}

// 本文の画像を、今回送ったファイル → 元の記事の対応表の順に探して、置く・残す・消す画像を決める。
// 対応表に残すのは、本文が参照する画像と、その組の -dark だけ。受け付けないときは問題をまとめて返す
export function planPostImages(input: { body: string; uploads: ImageUpload[]; previous: NowPostImage[] }): PostImagePlan {
  const issues: PostImageIssue[] = []
  const referenced = referencedNames(input.body, issues)
  const { names: uploadedNames, inspected } = inspectUploads(input.uploads, issues)
  const previousByName = new Map(input.previous.map((image) => [image.name, image]))
  const needed = neededNames(referenced, (name) => uploadedNames.has(name) || previousByName.has(name), issues)
  for (const name of uploadedNames) {
    if (!needed.has(name))
      issues.push({ code: PostImageIssueCode.unused, name, message: `画像 ${name} は本文のどこからも使われていません` })
  }
  if (issues.length > 0) return { ok: false, issues }
  return { ok: true, ...splitPlan(needed, inspected, input.previous) }
}

// 対応表に残す名前 (本文が参照する画像と、その組の -dark)。どこにも無い参照は missing にする
function neededNames(referenced: string[], isAvailable: (name: string) => boolean, issues: PostImageIssue[]): Set<string> {
  const needed = new Set<string>()
  for (const name of referenced) {
    if (!isAvailable(name)) {
      issues.push({ code: PostImageIssueCode.missing, name, message: `本文の画像 ${name} のファイルが送られていません` })
      continue
    }
    needed.add(name)
    const dark = darkPairName(name)
    if (dark && isAvailable(dark)) needed.add(dark)
  }
  return needed
}

// 残す名前ごとに、今回のファイルを置くか、元の画像を残すかを決める。中身が同じなら置き直さない
function splitPlan(
  needed: Set<string>,
  inspected: Map<string, InspectedUpload>,
  previousImages: NowPostImage[],
): { puts: PlannedPut[]; kept: NowPostImage[]; removed: NowPostImage[] } {
  const previousByName = new Map(previousImages.map((image) => [image.name, image]))
  const puts: PlannedPut[] = []
  const kept: NowPostImage[] = []
  const removed: NowPostImage[] = []
  for (const name of needed) {
    const upload = inspected.get(name)
    const previous = previousByName.get(name)
    if (!upload) {
      if (previous) kept.push(previous)
      continue
    }
    const sha256 = sha256Hex(upload.bytes)
    if (previous && previous.sha256 === sha256) {
      kept.push(previous)
      continue
    }
    puts.push({ ...upload, sha256 })
    if (previous) removed.push(previous)
  }
  for (const image of previousImages) {
    if (!needed.has(image.name)) removed.push(image)
  }
  return { puts, kept, removed }
}
