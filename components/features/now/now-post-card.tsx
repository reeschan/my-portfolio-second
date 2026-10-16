"use client"

import Link from "next/link"
import type { NowPost } from "@/lib/now/schema"
import { excerptOf } from "@/lib/now/excerpt"
import { nowPostPath } from "@/lib/now/feed"
import { formatDate } from "@/lib/format"
import { useLocale } from "@/lib/i18n/locale-context"

type NowPostCardProps = {
  post: NowPost
}

// 記事 1 件のカード。見出しの中のリンクをカード全体に広げ、どこを押しても・キーボードでも記事のページに移れるようにする (WorkCard と同じ作り)
export function NowPostCard({ post }: NowPostCardProps) {
  const locale = useLocale()

  return (
    <article className="relative rounded-lg border border-border/50 bg-background/50 p-4 transition-all hover:-translate-y-1 hover:shadow-lg focus-within:ring-2 focus-within:ring-ring">
      <time dateTime={post.publishedAt} className="text-xs text-muted-foreground">
        {formatDate(post.publishedAt, locale)}
      </time>
      <h2 className="mt-1 text-lg font-medium">
        <Link href={nowPostPath(post.id)} className="text-left after:absolute after:inset-0 focus:outline-hidden">
          {post.title}
        </Link>
      </h2>
      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{excerptOf(post.body)}</p>
    </article>
  )
}
