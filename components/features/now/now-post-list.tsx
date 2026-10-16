"use client"

import { useMessages } from "@/lib/i18n/locale-context"
import type { NowPost } from "@/lib/now/schema"
import { NowPostCard } from "./now-post-card"

type NowPostListProps = {
  // 新しい順に並べ済みのもの (lib/now/store.ts)
  posts: NowPost[]
}

// /now の記事カードの一覧。全文はカードのリンク先の記事ページ (/now/[id]) で読む
export function NowPostList({ posts }: NowPostListProps) {
  const messages = useMessages().now

  if (posts.length === 0) {
    return <p className="text-muted-foreground">{messages.empty}</p>
  }

  return (
    <section aria-label={messages.recent} className="grid gap-4 md:grid-cols-2">
      {posts.map((post) => (
        <NowPostCard key={post.id} post={post} />
      ))}
    </section>
  )
}
