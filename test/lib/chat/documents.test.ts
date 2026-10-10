// @perspectives api-contract external-mock
// @routes /chat /api/chat
import { beforeEach, describe, expect, it, vi } from "vitest"
import { HttpError } from "@/lib/api/errors"
import { clearChatDocumentsCache, hasBlobCredentials, loadChatDocuments } from "@/lib/chat/documents"

// 本物の Blob と手元のファイルは読まない。呼び出し方と、結果の扱い (欠け・失敗・キャッシュ) を確かめる
const { getMock, readFileMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  readFileMock: vi.fn(),
}))
vi.mock("@vercel/blob", () => ({ get: getMock }))
vi.mock("node:fs/promises", () => ({ readFile: readFileMock }))

const blobEnv = { NODE_ENV: "production", BLOB_READ_WRITE_TOKEN: "tok" } as NodeJS.ProcessEnv

// stream は 1 回しか読めないので、呼ばれるたびに作り直す
function blobResult(body: string) {
  return { statusCode: 200, stream: new Response(body).body, headers: new Headers(), blob: {} }
}

function mockBlobBodies() {
  getMock.mockImplementation((pathname: string) => Promise.resolve(blobResult(`本文:${pathname}`)))
}

async function expect503(promise: Promise<unknown>) {
  const error: unknown = await promise.catch((e: unknown) => e)
  expect(error).toBeInstanceOf(HttpError)
  expect((error as HttpError).status).toBe(503)
}

beforeEach(() => {
  clearChatDocumentsCache()
  vi.clearAllMocks()
  vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("hasBlobCredentials", () => {
  it("BLOB_READ_WRITE_TOKEN か BLOB_STORE_ID のどちらかが空でなければ true、どちらも未設定・空文字なら false", () => {
    expect(hasBlobCredentials({ NODE_ENV: "production", BLOB_READ_WRITE_TOKEN: "tok" })).toBe(true)
    expect(hasBlobCredentials({ NODE_ENV: "production", BLOB_STORE_ID: "store_1" })).toBe(true)
    expect(hasBlobCredentials({ NODE_ENV: "production", BLOB_READ_WRITE_TOKEN: "tok", BLOB_STORE_ID: "store_1" })).toBe(true)
    expect(hasBlobCredentials({ NODE_ENV: "production", BLOB_READ_WRITE_TOKEN: "", BLOB_STORE_ID: "" })).toBe(false)
    expect(hasBlobCredentials({ NODE_ENV: "production" })).toBe(false)
  })
})

describe("loadChatDocuments", () => {
  it("トークンがあれば private の Blob から CDN を通さずに 2 つの資料を読む", async () => {
    mockBlobBodies()

    const docs = await loadChatDocuments(blobEnv)

    expect(docs).toEqual({ resume: "本文:chat-docs/resume.md", profile: "本文:chat-docs/profile-freelance.md" })
    expect(getMock).toHaveBeenCalledTimes(2)
    for (const pathname of ["chat-docs/resume.md", "chat-docs/profile-freelance.md"]) {
      expect(getMock).toHaveBeenCalledWith(
        pathname,
        expect.objectContaining({ access: "private", token: "tok", useCache: false, abortSignal: expect.any(AbortSignal) as unknown }),
      )
    }
    expect(readFileMock).not.toHaveBeenCalled()
  })

  it("BLOB_STORE_ID だけあれば (OIDC 方式) token を渡さず storeId 付きで Blob から読む", async () => {
    mockBlobBodies()

    const docs = await loadChatDocuments({ NODE_ENV: "production", BLOB_STORE_ID: "store_1" })

    expect(docs).toEqual({ resume: "本文:chat-docs/resume.md", profile: "本文:chat-docs/profile-freelance.md" })
    expect(getMock).toHaveBeenCalledTimes(2)
    for (const [, options] of getMock.mock.calls as [string, Record<string, unknown>][]) {
      expect(options).toMatchObject({ access: "private", storeId: "store_1", useCache: false })
      expect(options).not.toHaveProperty("token")
    }
    expect(readFileMock).not.toHaveBeenCalled()
  })

  it("BLOB_READ_WRITE_TOKEN と BLOB_STORE_ID が両方あれば token だけを渡す", async () => {
    mockBlobBodies()

    await loadChatDocuments({ NODE_ENV: "production", BLOB_READ_WRITE_TOKEN: "tok", BLOB_STORE_ID: "store_1" })

    for (const [, options] of getMock.mock.calls as [string, Record<string, unknown>][]) {
      expect(options).toMatchObject({ token: "tok" })
      expect(options).not.toHaveProperty("storeId")
    }
  })

  it("トークンが無く開発中なら data/ のファイルを読む", async () => {
    readFileMock.mockImplementation((file: string) => Promise.resolve(`手元:${file}`))

    const docs = await loadChatDocuments({ NODE_ENV: "development" })

    const paths = readFileMock.mock.calls.map(([file]) => String(file))
    expect(paths.some((p) => p.includes("resume.md"))).toBe(true)
    expect(paths.some((p) => p.includes("profile-freelance.md"))).toBe(true)
    expect(docs.resume).toContain("resume.md")
    expect(docs.profile).toContain("profile-freelance.md")
    expect(getMock).not.toHaveBeenCalled()
  })

  it("トークンが無く本番なら 503", async () => {
    await expect503(loadChatDocuments({ NODE_ENV: "production" }))
    expect(getMock).not.toHaveBeenCalled()
    expect(readFileMock).not.toHaveBeenCalled()
  })

  it("資料が見つからなければ 503 で、失敗はキャッシュせず次の呼び出しで読み直す", async () => {
    getMock.mockResolvedValue(null)

    await expect503(loadChatDocuments(blobEnv))
    expect(getMock).toHaveBeenCalledTimes(2)
    // ログには欠けた資料の pathname だけを出す
    expect(console.error).toHaveBeenCalledWith(expect.any(String), ["chat-docs/resume.md", "chat-docs/profile-freelance.md"])

    mockBlobBodies()
    await expect(loadChatDocuments(blobEnv)).resolves.toMatchObject({ resume: "本文:chat-docs/resume.md" })
    expect(getMock).toHaveBeenCalledTimes(4)
  })

  it("片方が空文字 (空白だけ) でも 503", async () => {
    getMock.mockImplementation((pathname: string) => Promise.resolve(blobResult(pathname.includes("resume") ? "本文" : "  \n")))

    await expect503(loadChatDocuments(blobEnv))
    expect(console.error).toHaveBeenCalledWith(expect.any(String), ["chat-docs/profile-freelance.md"])
  })

  it("statusCode が 200 でなければ欠けているとみなして 503", async () => {
    getMock.mockResolvedValue({ statusCode: 304, stream: null, headers: new Headers(), blob: {} })
    await expect503(loadChatDocuments(blobEnv))
  })

  it("get が例外を投げたら原因をログに出して 503", async () => {
    const cause = new Error("timeout")
    getMock.mockRejectedValue(cause)

    await expect503(loadChatDocuments(blobEnv))
    expect(console.error).toHaveBeenCalledWith(expect.any(String), cause)
  })

  it("10 分以内の 2 回目は Blob を呼ばず、10 分を過ぎたら読み直す", async () => {
    mockBlobBodies()
    let time = 1_000_000
    const now = () => time

    await loadChatDocuments(blobEnv, now)
    expect(getMock).toHaveBeenCalledTimes(2)

    time += 600_000
    await loadChatDocuments(blobEnv, now)
    expect(getMock).toHaveBeenCalledTimes(2)

    time += 1
    await loadChatDocuments(blobEnv, now)
    expect(getMock).toHaveBeenCalledTimes(4)
  })
})
