// @coverage-map ignore 手元で持ち主が実行する道具のため
import { beforeEach, describe, expect, it, vi } from "vitest"
import { put } from "@vercel/blob"
// .mts は allowImportingTsExtensions が無いと書けないので、対応する .mjs の名前で import する (TS・Vite とも .mts に解決する)
import { uploadChatDocs } from "@/scripts/upload-chat-docs.mjs"

// 本物の Blob には書かない
vi.mock("@vercel/blob", () => ({ put: vi.fn(() => Promise.resolve({})) }))

const putMock = vi.mocked(put)
const env = { NODE_ENV: "test", BLOB_READ_WRITE_TOKEN: "test-token" } as NodeJS.ProcessEnv
const files: Record<string, string> = { "resume.md": "# 職務経歴書", "profile-freelance.md": "# 補足資料" }
const readDoc = (file: string) => Promise.resolve(files[file] ?? "")

describe("uploadChatDocs", () => {
  beforeEach(() => {
    putMock.mockClear()
  })

  it("2 つの資料を private・上書きありで上げ、pathname と文字数を返す", async () => {
    const result = await uploadChatDocs(env, readDoc)

    expect(putMock).toHaveBeenCalledTimes(2)
    for (const [pathname, content] of [
      ["chat-docs/resume.md", "# 職務経歴書"],
      ["chat-docs/profile-freelance.md", "# 補足資料"],
    ] as const) {
      expect(putMock).toHaveBeenCalledWith(
        pathname,
        content,
        expect.objectContaining({
          access: "private",
          token: "test-token",
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: "text/markdown; charset=utf-8",
        }),
      )
    }
    expect(result).toEqual([
      { pathname: "chat-docs/resume.md", length: "# 職務経歴書".length },
      { pathname: "chat-docs/profile-freelance.md", length: "# 補足資料".length },
    ])
  })

  it("BLOB_STORE_ID だけあれば (OIDC 方式) token を渡さず storeId 付きで上げる", async () => {
    await uploadChatDocs({ NODE_ENV: "test", BLOB_STORE_ID: "store_1" }, readDoc)

    expect(putMock).toHaveBeenCalledTimes(2)
    for (const call of putMock.mock.calls) {
      const options = call[2]
      expect(options).toMatchObject({ access: "private", storeId: "store_1", addRandomSuffix: false, allowOverwrite: true })
      expect(options).not.toHaveProperty("token")
    }
  })

  it.each([
    { NODE_ENV: "test" },
    { NODE_ENV: "test", BLOB_READ_WRITE_TOKEN: "" },
    { NODE_ENV: "test", BLOB_READ_WRITE_TOKEN: "", BLOB_STORE_ID: "" },
  ])("BLOB_READ_WRITE_TOKEN と BLOB_STORE_ID の両方が無ければ Error を投げ、put を呼ばない (%o)", async (noCredEnv) => {
    const promise = uploadChatDocs(noCredEnv as NodeJS.ProcessEnv, readDoc)
    await expect(promise).rejects.toThrow("BLOB_READ_WRITE_TOKEN")
    await expect(promise).rejects.toThrow("BLOB_STORE_ID")
    expect(putMock).not.toHaveBeenCalled()
  })

  it.each(["resume.md", "profile-freelance.md"])(
    "%s が空なら、そのファイル名を含む Error を投げ、put を 1 回も呼ばない",
    async (emptyFile) => {
      const read = (file: string) => Promise.resolve(file === emptyFile ? "  \n" : (files[file] ?? ""))

      await expect(uploadChatDocs(env, read)).rejects.toThrow(emptyFile)
      expect(putMock).not.toHaveBeenCalled()
    },
  )
})
