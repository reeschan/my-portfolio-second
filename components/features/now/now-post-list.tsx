"use client"

import { useState } from "react"
import { useMessages } from "@/lib/i18n/locale-context"
import type { NowPost } from "@/lib/now/schema"
import { NowPostCard } from "./now-post-card"
import { NowPostDialog } from "./now-post-dialog"

type NowPostListProps = {
  // 新しい順に並べ済みのもの (lib/now/store.ts)
  posts: NowPost[]
  // 最初から開いておく記事の id (RSS の item のリンク /now?post=<id> から来たとき)
  initialPostId?: string
}

// /now の記事カードの一覧と、詳細ダイアログの開閉
export function NowPostList({ posts, initialPostId }: NowPostListProps) {
  // 閉じるアニメーションの間も中身を出しておくため、開閉と選んだ記事を分けて持つ
  // 知らない id で来たときは何も開かず、一覧だけを出す
  const [selected, setSelected] = useState<NowPost | null>(() => posts.find((post) => post.id === initialPostId) ?? null)
  const [open, setOpen] = useState(selected !== null)
  const messages = useMessages().now

  if (posts.length === 0) {
    return <p className="text-muted-foreground">{messages.empty}</p>
  }

  return (
    <>
      <section aria-label={messages.recent} className="grid gap-4 md:grid-cols-2">
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
      <NowPostDialog
        post={selected}
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          // 閉じたら ?post= を消し、再読み込みや共有でまた開かないようにする
          if (!next && window.location.search) window.history.replaceState(null, "", window.location.pathname)
        }}
      />
    </>
  )
}
