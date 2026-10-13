"use client"

import type { NowPost } from "@/lib/now/schema"
import { excerptOf } from "@/lib/now/excerpt"
import { formatDate } from "@/lib/format"
import { useLocale } from "@/lib/i18n/locale-context"

type NowPostCardProps = {
  post: NowPost
  onSelect: () => void
}

// 記事 1 件のカード。見出しの中のボタンをカード全体に広げ、どこを押しても・キーボードでも開けるようにする (WorkCard と同じ作り)
export function NowPostCard({ post, onSelect }: NowPostCardProps) {
  const locale = useLocale()

  return (
    <article className="relative rounded-lg border border-border/50 bg-background/50 p-4 transition-all hover:-translate-y-1 hover:shadow-lg focus-within:ring-2 focus-within:ring-ring">
      <time dateTime={post.publishedAt} className="text-xs text-muted-foreground">
        {formatDate(post.publishedAt, locale)}
      </time>
      <h2 className="mt-1 text-lg font-medium">
        <button type="button" onClick={onSelect} className="text-left after:absolute after:inset-0 focus:outline-hidden">
          {post.title}
        </button>
      </h2>
      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{excerptOf(post.body)}</p>
    </article>
  )
}
