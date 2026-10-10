// 手元の data/resume.md と data/profile-freelance.md を Vercel Blob (private) に上げる。
//
//   pnpm chat-docs:upload   .env.local の資格情報を使って上書き保存する
//
// 資格情報は次のどちらかでよい (vercel env pull で .env.local に入る)
// - BLOB_READ_WRITE_TOKEN (トークン方式)
// - BLOB_STORE_ID と VERCEL_OIDC_TOKEN (OIDC 方式。OIDC トークンは SDK が VERCEL_OIDC_TOKEN から読む)
//
// - 資料はリポジトリに含めず Blob に置く。チャットは lib/chat/documents.ts から読む
// - 資料の中身・トークン・Blob の URL は個人情報や秘密を含むので表示しない

import { readFile } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { put } from "@vercel/blob"
import { chatDocs, hasBlobCredentials } from "../lib/chat/documents"

export async function uploadChatDocs(
  env: NodeJS.ProcessEnv,
  readDoc: (file: string) => Promise<string>,
): Promise<{ pathname: string; length: number }[]> {
  if (!hasBlobCredentials(env)) {
    throw new Error("BLOB_READ_WRITE_TOKEN か BLOB_STORE_ID を設定してください (vercel env pull で .env.local に入ります)")
  }
  // token と storeId は片方だけ渡す。トークンが無ければ OIDC 方式で、OIDC トークンは SDK が VERCEL_OIDC_TOKEN から読む
  const credentials = env.BLOB_READ_WRITE_TOKEN ? { token: env.BLOB_READ_WRITE_TOKEN } : { storeId: env.BLOB_STORE_ID }

  const entries = [chatDocs.resume, chatDocs.profile]
  // 片方だけ上がった状態を作らないよう、先に両方を読んで空でないことを確かめてから上げる
  const docs = await Promise.all(entries.map(async (entry) => ({ entry, content: await readDoc(entry.file) })))
  const empty = docs.filter(({ content }) => !content.trim()).map(({ entry }) => entry.file)
  if (empty.length > 0) throw new Error(`資料が空です: ${empty.join(", ")}`)

  const results: { pathname: string; length: number }[] = []
  for (const { entry, content } of docs) {
    await put(entry.pathname, content, {
      access: "private",
      ...credentials,
      // 同じ pathname で読むので、名前に乱数を付けず上書きする
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "text/markdown; charset=utf-8",
    })
    results.push({ pathname: entry.pathname, length: content.length })
  }
  return results
}

// テストから import したときは実行せず、ファイルとして直接実行されたときだけ上げる
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const results = await uploadChatDocs(process.env, (file) => readFile(path.join(process.cwd(), "data", file), "utf8"))
    for (const { pathname, length } of results) console.log(`${pathname} (${length} 文字) を保存しました`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
