import { del, head, list, put } from "@vercel/blob"
import { HttpError } from "@/lib/api/errors"

// /now の記事の画像の置き場。本番は /now 専用の public の Vercel Blob、開発と E2E はプロセス内のメモリ (ADR 0031)
// 記事の保存先 (store.ts) と同じく、投稿 API はこの面だけを使い、どちらの実装かを知らない
export interface NowImageStore {
  // 置いた画像の URL を返す。同じ中身を送り直したときは既にある画像の URL を返す
  put(input: { postId: string; name: string; sha256: string; bytes: Uint8Array; contentType: string }): Promise<{ url: string }>
  removeUrls(urls: string[]): Promise<void>
  // 記事 id の画像をまとめて消す
  removePost(postId: string): Promise<void>
}

export type MemoryImageStore = NowImageStore & {
  // テストが置かれた画像を確かめるため
  urls(): string[]
}

// 中身が変われば pathname も変わるので、同じ pathname は同じ中身とみなせる (上書きは起きない)
function imagePathname(input: { postId: string; name: string; sha256: string }): string {
  return `${postPrefix(input.postId)}${input.sha256.slice(0, 16)}-${input.name}`
}

function postPrefix(postId: string): string {
  return `now/${postId}/`
}

// pathname に中身のハッシュが入るので、キャッシュは 1 年にする
const cacheControlMaxAge = 31_536_000

// トークンは必ず明示して渡す (SDK がチャットの資料の BLOB_READ_WRITE_TOKEN など、環境変数の別のストアを使わないように)
export function createBlobImageStore(token: string): NowImageStore {
  return {
    async put(input) {
      const pathname = imagePathname(input)
      try {
        const result = await put(pathname, Buffer.from(input.bytes), {
          access: "public",
          token,
          contentType: input.contentType,
          cacheControlMaxAge,
          addRandomSuffix: false,
        })
        return { url: result.url }
      } catch (error) {
        // allowOverwrite を付けないので、同じ pathname が既にあると put は失敗する。そのときのエラーの型は SDK の d.ts で決まっていないので、
        // head で既にあるかを見て、あればその URL を返す。無ければ元の失敗をそのまま投げる
        const existing = await head(pathname, { token }).catch(() => null)
        if (existing) return { url: existing.url }
        throw error
      }
    },
    async removeUrls(urls) {
      if (urls.length === 0) return
      await del(urls, { token })
    },
    async removePost(postId) {
      let cursor: string | undefined
      do {
        const page = await list({ prefix: postPrefix(postId), token, ...(cursor ? { cursor } : {}) })
        const urls = page.blobs.map((blob) => blob.url)
        if (urls.length > 0) await del(urls, { token })
        cursor = page.hasMore ? page.cursor : undefined
      } while (cursor)
    },
  }
}

// メモリ版は画像の URL に data: URL を返す (E2E で <img src> にそのまま使う)
export function createMemoryImageStore(): MemoryImageStore {
  const images = new Map<string, { postId: string; url: string }>()
  return {
    put(input) {
      const pathname = imagePathname(input)
      const url = `data:${input.contentType};base64,${Buffer.from(input.bytes).toString("base64")}`
      const existing = images.get(pathname)
      if (existing) return Promise.resolve({ url: existing.url })
      images.set(pathname, { postId: input.postId, url })
      return Promise.resolve({ url })
    },
    removeUrls(urls) {
      const targets = new Set(urls)
      for (const [pathname, image] of images) {
        if (targets.has(image.url)) images.delete(pathname)
      }
      return Promise.resolve()
    },
    removePost(postId) {
      for (const [pathname, image] of images) {
        if (image.postId === postId) images.delete(pathname)
      }
      return Promise.resolve()
    },
    urls: () => [...images.values()].map((image) => image.url),
  }
}

// 開発サーバーはファイル保存のたびにモジュールを読み直すので、メモリの置き場は globalThis に置いて画像を残す
const globalForNowImages = globalThis as typeof globalThis & { __nowMemoryImageStore?: MemoryImageStore }

// 環境変数から置き場を選ぶ。選び方は記事の保存先 (getNowStore) と同じ条件
// トークンの空文字は「設定していない」と同じに扱う。本番でトークンが無ければ null (画像つきの投稿だけを断る)
export function getNowImageStore(env: NodeJS.ProcessEnv = process.env): NowImageStore | null {
  const token = env.NOW_IMAGES_BLOB_READ_WRITE_TOKEN
  if (token) return createBlobImageStore(token)

  if (env.NOW_POSTS_STORE === "memory" || env.NODE_ENV !== "production") {
    globalForNowImages.__nowMemoryImageStore ??= createMemoryImageStore()
    return globalForNowImages.__nowMemoryImageStore
  }
  return null
}

// 画像つきの投稿が使う置き場。本番でトークンが無ければ 503 の HttpError を投げる
export function requireNowImageStore(): NowImageStore {
  const store = getNowImageStore()
  if (!store) throw new HttpError(503, "画像の置き場が設定されていません。")
  return store
}
