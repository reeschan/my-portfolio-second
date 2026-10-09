import { apiFetchJson } from "@/lib/api/client"
import { HttpError } from "@/lib/api/errors"
import { nowPostSchema, sortNewestFirst, type NowPost } from "./schema"

// /now の投稿の保存先。本番は Upstash Redis (Vercel Marketplace)、開発と E2E はプロセス内のメモリ (ADR 0015)
export interface NowPostStore {
  list(): Promise<NowPost[]>
  // 見つからなければ null
  get(id: string): Promise<NowPost | null>
  save(post: NowPost): Promise<void>
  // 消せたら true、見つからなければ false
  remove(id: string): Promise<boolean>
}

const hashKey = "now:posts"

// Upstash の REST API を apiFetch で呼ぶ。使うコマンドは 4 つだけなので SDK は入れない
// 失敗は apiFetch が ApiError を投げる。利用者への文言は上位 (Route Handler・ページ) が決める
export function createUpstashStore(url: string, token: string): NowPostStore {
  async function command<T>(...args: string[]): Promise<T> {
    const data = await apiFetchJson(url, {
      service: `Upstash ${args[0]}`,
      // 応答しないときもページを空の一覧で出し、書き込み API は 502 を返せるよう、待つ時間に上限を付ける
      timeoutMs: 5_000,
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      cache: "no-store",
    })
    return (data as { result: T }).result
  }

  return {
    async list() {
      // HGETALL は [field1, value1, field2, value2, ...] の平らな配列で返る
      const flat = (await command<string[] | null>("HGETALL", hashKey)) ?? []
      const values = flat.filter((_, i) => i % 2 === 1)
      return sortNewestFirst(values.flatMap(parsePost))
    },
    async get(id) {
      const raw = await command<string | null>("HGET", hashKey, id)
      return raw === null ? null : (parsePost(raw)[0] ?? null)
    },
    async save(post) {
      await command("HSET", hashKey, post.id, JSON.stringify(post))
    },
    async remove(id) {
      return (await command<number>("HDEL", hashKey, id)) > 0
    },
  }
}

// 壊れた値は一覧から外す (1 件のせいでページ全体を落とさない)
function parsePost(raw: string): NowPost[] {
  try {
    const parsed = nowPostSchema.safeParse(JSON.parse(raw))
    return parsed.success ? [parsed.data] : []
  } catch {
    return []
  }
}

export function createMemoryStore(): NowPostStore {
  const posts = new Map<string, NowPost>()
  return {
    list: () => Promise.resolve(sortNewestFirst([...posts.values()])),
    get: (id) => Promise.resolve(posts.get(id) ?? null),
    save: (post) => {
      posts.set(post.id, post)
      return Promise.resolve()
    },
    remove: (id) => Promise.resolve(posts.delete(id)),
  }
}

// 開発サーバーはファイル保存のたびにモジュールを読み直すので、メモリの保存先は globalThis に置いて投稿を残す
const globalForNow = globalThis as typeof globalThis & { __nowMemoryStore?: NowPostStore }

// 環境変数から保存先を選ぶ。本番で Redis が未設定なら null (投稿を受け付けず、一覧は空にする)
// メモリは再起動やインスタンスの切り替えで消えるので、本番では NOW_POSTS_STORE=memory を明示したとき (E2E) だけ使う
export function getNowStore(env: NodeJS.ProcessEnv = process.env): NowPostStore | null {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN
  if (url && token) return createUpstashStore(url, token)

  if (env.NOW_POSTS_STORE === "memory" || env.NODE_ENV !== "production") {
    globalForNow.__nowMemoryStore ??= createMemoryStore()
    return globalForNow.__nowMemoryStore
  }
  return null
}

// 書き込み API が使う保存先。本番で Redis が未設定なら 503 の HttpError を投げる
export function requireNowStore(): NowPostStore {
  const store = getNowStore()
  if (!store) throw new HttpError(503, "投稿の保存先が設定されていません。")
  return store
}
