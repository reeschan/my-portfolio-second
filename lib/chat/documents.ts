import { readFile } from "node:fs/promises"
import path from "node:path"
import { get } from "@vercel/blob"
import { HttpError } from "@/lib/api/errors"

// チャットの資料 (職務経歴書と補足資料) の置き場所
// 資料はリポジトリに含めず、本番は Vercel Blob の private ストアから読む。開発中だけ data/ の手元のファイルを読む
export const chatDocs = {
  resume: { pathname: "chat-docs/resume.md", file: "resume.md" },
  profile: { pathname: "chat-docs/profile-freelance.md", file: "profile-freelance.md" },
} as const

export type ChatDocuments = { resume: string; profile: string }

type DocKey = keyof typeof chatDocs
type DocEntry = (typeof chatDocs)[DocKey]
// 読めなかった資料は null (欠けている) として扱う
type RawDocuments = Record<DocKey, string | null>

// 資料を毎回 Blob から読むと応答が遅くなり、Blob の読み出し回数も増えるので、プロセス内で 10 分だけ持つ
// 10 分にしているのは、資料を上書きしたあと遅くとも 10 分で新しい版に切り替わるようにするため
const cacheTtlMs = 600_000
// Blob が応答しないときにチャットの応答全体を待たせないよう、読み出しに上限を付ける
const blobTimeoutMs = 5_000

const unavailableMessage = "チャット機能は現在ご利用いただけません。"

let cache: { docs: ChatDocuments; loadedAt: number } | null = null

// Blob の資格情報は 2 つの方式のどちらかで渡る
// - トークン方式: BLOB_READ_WRITE_TOKEN
// - OIDC 方式: BLOB_STORE_ID と OIDC トークン。トークン (VERCEL_OIDC_TOKEN) は SDK が環境変数や Vercel の実行時から自分で取る
// どちらかの変数があれば Blob を使う。空文字は「設定していない」と同じに扱う (Vercel の環境変数を空で残したときに Blob を呼んで失敗させない)
export function hasBlobCredentials(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.BLOB_READ_WRITE_TOKEN || env.BLOB_STORE_ID)
}

// get に渡す資格情報。token と storeId を同時に渡すと SDK がどちらを使うか分かりにくいので、片方だけ渡す
// env を引数で受けるのは、process.env 以外を渡すテストでも同じ値が SDK に届くことを確かめられるようにするため
function blobCredentialOptions(env: NodeJS.ProcessEnv): { token: string } | { storeId: string | undefined } {
  if (env.BLOB_READ_WRITE_TOKEN) return { token: env.BLOB_READ_WRITE_TOKEN }
  return { storeId: env.BLOB_STORE_ID }
}

// テストが前のテストのキャッシュを引き継がないよう、外から空にできるようにする
export function clearChatDocumentsCache(): void {
  cache = null
}

async function readFromBlob(entry: DocEntry, env: NodeJS.ProcessEnv): Promise<string | null> {
  const result = await get(entry.pathname, {
    access: "private",
    ...blobCredentialOptions(env),
    // 資料を上書きしたとき CDN に残った古い版を読まないよう、毎回元のストレージから読む
    // アプリ側で 10 分キャッシュするので、CDN を通さない遅さは問題にならない
    useCache: false,
    abortSignal: AbortSignal.timeout(blobTimeoutMs),
  })
  // 見つからない (null) と、本文のない応答 (304 など) はどちらも「欠けている」とみなす
  if (!result || result.statusCode !== 200) return null
  return await new Response(result.stream).text()
}

function readFromLocal(entry: DocEntry): Promise<string> {
  return readFile(path.join(process.cwd(), "data", entry.file), "utf8")
}

// 2 つの資料は互いに依存しないので並列に読む
async function readAll(read: (entry: DocEntry) => Promise<string | null>): Promise<RawDocuments> {
  const [resume, profile] = await Promise.all([read(chatDocs.resume), read(chatDocs.profile)])
  return { resume, profile }
}

// 環境から読み方を選ぶ。本番で Blob の資格情報が無ければ資料を読めないので、チャットを止める (503)
function selectReader(env: NodeJS.ProcessEnv): (entry: DocEntry) => Promise<string | null> {
  if (hasBlobCredentials(env)) return (entry) => readFromBlob(entry, env)
  if (env.NODE_ENV !== "production") return readFromLocal
  throw new HttpError(503, unavailableMessage)
}

// 片方でも欠けた資料でシステムプロンプトを作ると根拠のない回答をしかねないので、両方そろわなければ 503 にする
// ログには欠けた資料の pathname だけを出す (資料の中身は個人情報を含むのでログに残さない)
function ensureComplete(raw: RawDocuments): ChatDocuments {
  const missing = (Object.keys(chatDocs) as DocKey[]).filter((key) => !raw[key]?.trim())
  if (missing.length > 0 || raw.resume === null || raw.profile === null) {
    console.error(
      "チャットの資料が欠けています",
      missing.map((key) => chatDocs[key].pathname),
    )
    throw new HttpError(503, unavailableMessage)
  }
  return { resume: raw.resume, profile: raw.profile }
}

export async function loadChatDocuments(env: NodeJS.ProcessEnv = process.env, now: () => number = Date.now): Promise<ChatDocuments> {
  if (cache && now() - cache.loadedAt <= cacheTtlMs) return cache.docs

  const read = selectReader(env)
  let raw: RawDocuments
  try {
    raw = await readAll(read)
  } catch (error) {
    // 通信できない・時間切れ・権限エラーなど。原因はログに残し、利用者には同じ 503 の文言だけを見せる
    console.error("チャットの資料を読めませんでした", error)
    throw new HttpError(503, unavailableMessage)
  }

  const docs = ensureComplete(raw)
  // 失敗はキャッシュしない (一時的な障害が直れば次の呼び出しで読み直せるように)
  cache = { docs, loadedAt: now() }
  return docs
}
