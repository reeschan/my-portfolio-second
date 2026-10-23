import { cacheLife, cacheTag, revalidateTag } from "next/cache"
import type { NowPost } from "./schema"
import { getNowStore } from "./store"

// /now の記事の作り置き (ADR 0035)。開くたびに外部の保存先 (Upstash) を往復しないようにする。
// 投稿・更新・削除の API が成功したら、このタグの作り置きを捨てて作り直させる

export const nowPostsTag = "now-posts"

export async function listNowPostsCached(): Promise<NowPost[]> {
  "use cache"
  cacheTag(nowPostsTag)
  // Vercel では "use cache" の置き場所がインスタンスのメモリなので、別のインスタンスに残った古い作り置きは
  // revalidateTag では消せない。寿命の上限を 5 分にして、投稿がいつまでも出ない状態を防ぐ (ADR 0035)。
  // expire は revalidate より長くする (Next.js の決まり)
  cacheLife({ stale: 300, revalidate: 300, expire: 86400 })

  const store = getNowStore()
  // 保存先が無い (本番で Redis が未設定) なら、記事は 1 件も無い
  if (!store) return []
  // 保存先の失敗は捕まえずに投げる。投げた結果は作り置きされないので、失敗の文言が 5 分残らない
  return store.list()
}

export async function getNowPostCached(id: string): Promise<NowPost | null> {
  "use cache"
  cacheTag(nowPostsTag)
  // 一覧と同じ寿命にする。別のインスタンスに残った古い記事の上限も 5 分 (listNowPostsCached のコメント)
  cacheLife({ stale: 300, revalidate: 300, expire: 86400 })

  const store = getNowStore()
  if (!store) return null
  // 保存先の失敗は捕まえずに投げる (記事のページは今までどおり 5xx を返す)
  return store.get(id)
}

// 投稿・更新・削除の API が、保存に成功したあとで呼ぶ。失敗したときは呼ばない
// Route Handler からは updateTag を使えない (Server Action 専用) ので revalidateTag を使う。
// { expire: 0 } で、投稿の直後に開いた人に古い一覧を出さない (revalidateTag.md)
export function revalidateNowPosts(): void {
  revalidateTag(nowPostsTag, { expire: 0 })
}
