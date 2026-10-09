import type { Metadata } from "next"
import { connection } from "next/server"
import { Callout, TextLink } from "@/components/common"
import { NowPostList } from "@/components/features/now/now-post-list"
import { PageTemplate } from "@/components/layout/page-template"
import { now } from "@/data/now"
import { formatJapaneseDateTime } from "@/lib/format"
import type { NowPost } from "@/lib/now/schema"
import { getNowStore } from "@/lib/now/store"

export const metadata: Metadata = {
  title: "Now | Ryuki Tobita's Portfolio",
  description: "いま取り組んでいること",
}

export default async function NowPage() {
  // 記事は POST /api/now でいつでも増えるので、ビルド時に固めずリクエストごとに読む
  await connection()
  const { posts, loadError } = await loadPosts()
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

        {loadError ? (
          <Callout variant="tinted">
            <p>{loadError}</p>
          </Callout>
        ) : (
          <NowPostList posts={posts} />
        )}

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

// 記事を読む。保存先が落ちていても (ApiError) ページは出し、文言はここ (上位) で決める
async function loadPosts(): Promise<{ posts: NowPost[]; loadError: string | null }> {
  const store = getNowStore()
  if (!store) return { posts: [], loadError: null }
  try {
    return { posts: await store.list(), loadError: null }
  } catch (error) {
    console.error("Failed to load now posts", error)
    return { posts: [], loadError: "記事を読み込めませんでした。時間をおいて再度お試しください。" }
  }
}
