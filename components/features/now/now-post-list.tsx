"use client"

import { useState } from "react"
import type { NowPost } from "@/lib/now/schema"
import { NowPostCard } from "./now-post-card"
import { NowPostDialog } from "./now-post-dialog"

type NowPostListProps = {
  // 新しい順に並べ済みのもの (lib/now/store.ts)
  posts: NowPost[]
}

// /now の記事カードの一覧と、詳細ダイアログの開閉
export function NowPostList({ posts }: NowPostListProps) {
  // 閉じるアニメーションの間も中身を出しておくため、開閉と選んだ記事を分けて持つ
  const [selected, setSelected] = useState<NowPost | null>(null)
  const [open, setOpen] = useState(false)

  if (posts.length === 0) {
    return <p className="text-muted-foreground">まだ投稿はありません。</p>
  }

  return (
    <>
      <section aria-label="最近の投稿" className="grid gap-4 md:grid-cols-2">
        {posts.map((post) => (
          <NowPostCard
            key={post.id}
            post={post}
            onSelect={() => {
              setSelected(post)
              setOpen(true)
            }}
          />
        ))}
      </section>
      <NowPostDialog post={selected} open={open} onOpenChange={setOpen} />
    </>
  )
}
