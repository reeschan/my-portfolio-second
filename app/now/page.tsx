import type { Metadata } from "next"
import { connection } from "next/server"
import { Callout, TextLink } from "@/components/common"
import { NowPostList } from "@/components/features/now/now-post-list"
import { PageTemplate } from "@/components/layout/page-template"
import { now } from "@/data/now"
import { formatJapaneseDateTime } from "@/lib/format"
import { listNowPosts } from "@/lib/now/store"

export const metadata: Metadata = {
  title: "Now | Ryuki Tobita's Portfolio",
  description: "いま取り組んでいること",
}

export default async function NowPage() {
  // 記事は POST /api/now でいつでも増えるので、ビルド時に固めずリクエストごとに読む
  await connection()
  const posts = await listNowPosts()
  const latest = posts[0]

  return (
    <PageTemplate title="Now">
      <div className="max-w-4xl space-y-8">
        <p className="text-muted-foreground">
          いま取り組んでいることを、新しい順に並べています。
          {latest && (
            <>
              <time dateTime={latest.publishedAt}>{formatJapaneseDateTime(latest.publishedAt)}</time>更新
            </>
          )}
          {now.location && <>・{now.location}</>}
        </p>

        <NowPostList posts={posts} />

        {now.availability && (
          <Callout variant="emphasis">
            <p>{now.availability}</p>
          </Callout>
        )}

        <p className="text-sm text-muted-foreground">
          このページは <TextLink href="https://nownownow.com/about">nownownow.com/about</TextLink> の考え方にならっています。
        </p>
      </div>
    </PageTemplate>
  )
}
