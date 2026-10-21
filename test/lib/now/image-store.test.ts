// @perspectives api-contract
// @routes /api/now
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { HttpError } from "@/lib/api/errors"
import { createBlobImageStore, createMemoryImageStore, getNowImageStore, requireNowImageStore } from "@/lib/now/image-store"

// 本物の Blob には書かない。SDK の呼び方 (パス・public・トークン・キャッシュ・上書きしないこと) を確かめる
const { putMock, headMock, delMock, listMock } = vi.hoisted(() => ({
  putMock: vi.fn(),
  headMock: vi.fn(),
  delMock: vi.fn(),
  listMock: vi.fn(),
}))
vi.mock("@vercel/blob", () => ({ put: putMock, head: headMock, del: delMock, list: listMock }))

const sha256 = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
const input = {
  postId: "post-1",
  name: "diagram-light.svg",
  sha256,
  bytes: new TextEncoder().encode("<svg/>"),
  contentType: "image/svg+xml",
}
const pathname = "now/post-1/0123456789abcdef-diagram-light.svg"

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("createBlobImageStore", () => {
  it("put は public・トークン明示・1 年のキャッシュ・ランダムな接尾辞なし・上書きなしで置き、URL を返す", async () => {
    putMock.mockResolvedValue({ url: "https://blob.example/now/post-1/x.svg" })

    const result = await createBlobImageStore("img-token").put(input)

    expect(result).toEqual({ url: "https://blob.example/now/post-1/x.svg" })
    expect(putMock).toHaveBeenCalledTimes(1)
    const [calledPathname, body, options] = putMock.mock.calls[0] as [string, Buffer, Record<string, unknown>]
    expect(calledPathname).toBe(pathname)
    expect(new Uint8Array(body)).toEqual(input.bytes)
    expect(options).toMatchObject({
      access: "public",
      token: "img-token",
      contentType: "image/svg+xml",
      cacheControlMaxAge: 31536000,
      addRandomSuffix: false,
    })
    expect(options).not.toHaveProperty("allowOverwrite")
    expect(headMock).not.toHaveBeenCalled()
  })

  it("同じ pathname が既にあって put が失敗したら、head で既存の URL を返す", async () => {
    putMock.mockRejectedValue(new Error("This blob already exists"))
    headMock.mockResolvedValue({ url: "https://blob.example/existing.svg", pathname })

    const result = await createBlobImageStore("img-token").put(input)

    expect(result).toEqual({ url: "https://blob.example/existing.svg" })
    expect(headMock).toHaveBeenCalledWith(pathname, { token: "img-token" })
  })

  it("put が失敗して head でも見つからなければ、put の失敗をそのまま投げる", async () => {
    const cause = new Error("service unavailable")
    putMock.mockRejectedValue(cause)
    headMock.mockRejectedValue(new Error("not found"))

    await expect(createBlobImageStore("img-token").put(input)).rejects.toBe(cause)
  })

  it("removeUrls は del をトークン付きで 1 回呼び、空の配列なら呼ばない", async () => {
    const store = createBlobImageStore("img-token")

    await store.removeUrls(["https://blob.example/a.svg", "https://blob.example/b.svg"])
    expect(delMock).toHaveBeenCalledTimes(1)
    expect(delMock).toHaveBeenCalledWith(["https://blob.example/a.svg", "https://blob.example/b.svg"], { token: "img-token" })

    delMock.mockClear()
    await store.removeUrls([])
    expect(delMock).not.toHaveBeenCalled()
  })

  it("removePost は記事 id の接頭辞で list を cursor でたどり、全部 del する", async () => {
    listMock
      .mockResolvedValueOnce({ blobs: [{ url: "https://blob.example/1" }, { url: "https://blob.example/2" }], hasMore: true, cursor: "c1" })
      .mockResolvedValueOnce({ blobs: [{ url: "https://blob.example/3" }], hasMore: false })

    await createBlobImageStore("img-token").removePost("post-1")

    expect(listMock).toHaveBeenCalledTimes(2)
    expect(listMock).toHaveBeenNthCalledWith(1, { prefix: "now/post-1/", token: "img-token" })
    expect(listMock).toHaveBeenNthCalledWith(2, { prefix: "now/post-1/", token: "img-token", cursor: "c1" })
    const deleted = (delMock.mock.calls as [string[], Record<string, unknown>][]).flatMap(([urls, options]) => {
      expect(options).toEqual({ token: "img-token" })
      return urls
    })
    expect(deleted).toEqual(["https://blob.example/1", "https://blob.example/2", "https://blob.example/3"])
  })

  it("removePost で画像が 1 枚も無ければ del を呼ばない", async () => {
    listMock.mockResolvedValue({ blobs: [], hasMore: false })

    await createBlobImageStore("img-token").removePost("post-1")

    expect(delMock).not.toHaveBeenCalled()
  })
})

describe("createMemoryImageStore", () => {
  it("put は data: URL を返し、urls() に出る", async () => {
    const store = createMemoryImageStore()

    const { url } = await store.put(input)

    expect(url).toBe(`data:image/svg+xml;base64,${Buffer.from("<svg/>").toString("base64")}`)
    expect(store.urls()).toEqual([url])
  })

  it("removeUrls で指定した画像だけが消える", async () => {
    const store = createMemoryImageStore()
    const a = await store.put(input)
    const b = await store.put({ ...input, name: "other.png", contentType: "image/png", bytes: new Uint8Array([1, 2, 3]) })

    await store.removeUrls([a.url])

    expect(store.urls()).toEqual([b.url])
  })

  it("removePost でその記事の画像だけが消える", async () => {
    const store = createMemoryImageStore()
    await store.put(input)
    const other = await store.put({ ...input, postId: "post-2", bytes: new Uint8Array([9]) })

    await store.removePost("post-1")

    expect(store.urls()).toEqual([other.url])
  })
})

describe("getNowImageStore", () => {
  it("NOW_IMAGES_BLOB_READ_WRITE_TOKEN があれば、本番でも Blob 版をそのトークンで使う", async () => {
    putMock.mockResolvedValue({ url: "https://blob.example/x.svg" })

    const store = getNowImageStore({ NODE_ENV: "production", NOW_IMAGES_BLOB_READ_WRITE_TOKEN: "img-token" })
    await store?.put(input)

    expect(putMock).toHaveBeenCalledWith(pathname, expect.anything(), expect.objectContaining({ token: "img-token" }))
  })

  it("チャットの資料の BLOB_READ_WRITE_TOKEN は読まない", () => {
    expect(getNowImageStore({ NODE_ENV: "production", BLOB_READ_WRITE_TOKEN: "chat-token" })).toBeNull()
  })

  it("トークンが無ければ、開発中と NOW_POSTS_STORE=memory でメモリ版 (同じものを返す)", async () => {
    const dev = getNowImageStore({ NODE_ENV: "development" })
    const e2e = getNowImageStore({ NODE_ENV: "production", NOW_POSTS_STORE: "memory" })

    expect(dev).not.toBeNull()
    expect(e2e).toBe(dev)
    const { url } = (await dev?.put(input)) ?? { url: "" }
    expect(url.startsWith("data:image/svg+xml;base64,")).toBe(true)
    expect(putMock).not.toHaveBeenCalled()
  })

  it("トークンが空文字なら無いのと同じ。本番でトークンもメモリの指定も無ければ null", () => {
    expect(getNowImageStore({ NODE_ENV: "production", NOW_IMAGES_BLOB_READ_WRITE_TOKEN: "" })).toBeNull()
    expect(getNowImageStore({ NODE_ENV: "production" })).toBeNull()
    expect(getNowImageStore({ NODE_ENV: "development", NOW_IMAGES_BLOB_READ_WRITE_TOKEN: "" })).not.toBeNull()
  })
})

describe("requireNowImageStore", () => {
  it("置き場が選べなければ 503 の HttpError を投げる", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("NOW_IMAGES_BLOB_READ_WRITE_TOKEN", "")
    vi.stubEnv("NOW_POSTS_STORE", "")

    const error: unknown = (() => {
      try {
        requireNowImageStore()
        return null
      } catch (e) {
        return e
      }
    })()

    expect(error).toBeInstanceOf(HttpError)
    expect((error as HttpError).status).toBe(503)
    expect((error as HttpError).message).toBe("画像の置き場が設定されていません。")
  })

  it("置き場が選べればそれを返す", () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("NOW_IMAGES_BLOB_READ_WRITE_TOKEN", "")

    expect(requireNowImageStore()).toBe(getNowImageStore({ NODE_ENV: "development" }))
  })
})
