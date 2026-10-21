import type { NowPostImage } from "@/lib/now/schema"

// 記事の本文の画像の参照を、画像の対応表で引く部品 (docs/specs/now-post-images.md の「画像の組」「描画」)。
// サーバー部品とクライアント部品の両方から使うので、node: のモジュールを import しない (投稿の計画は post-images.ts)

// 参照の値が外部を指すか。/ で始まるもの (// も含む) と、スキームのあるもの (http:・https:・data: など) は外部
export function isExternalImageSrc(src: string): boolean {
  const value = src.trim()
  return value.startsWith("/") || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(value)
}

// 参照の値からファイル名を取り出す (最後の / より後ろ。./ や ../ も同じ)。URL エンコードは戻してから返す
export function imageFileNameOf(src: string): string {
  const value = src.trim()
  const name = value.slice(value.lastIndexOf("/") + 1)
  try {
    return decodeURIComponent(name)
  } catch {
    // 壊れたエンコードはそのまま返す (ファイル名の検査で断られる)
    return name
  }
}

// <基>-light.<拡張子> と組になる <基>-dark.<拡張子>。-light で終わらなければ null
export function darkPairName(name: string): string | null {
  const match = /^(.+)-light(\.[^.]+)$/.exec(name)
  return match ? `${match[1]}-dark${match[2]}` : null
}

export type ImageLookupResult = { light: NowPostImage; dark?: NowPostImage }

// 本文の画像の参照 (src) を対応表で引く。-light の画像なら組の -dark も返す。外部の参照と表に無い名前は null
export function imageLookup(images: NowPostImage[]): (src: string) => ImageLookupResult | null {
  const byName = new Map(images.map((image) => [image.name, image]))
  return (src) => {
    if (isExternalImageSrc(src)) return null
    const name = imageFileNameOf(src)
    const light = byName.get(name)
    if (!light) return null
    const darkName = darkPairName(name)
    const dark = darkName ? byName.get(darkName) : undefined
    return dark ? { light, dark } : { light }
  }
}
