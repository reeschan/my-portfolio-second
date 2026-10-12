import type { Metadata } from "next"
import { connection } from "next/server"
import { Callout, TextLink } from "@/components/common"
import { NowPostList } from "@/components/features/now/now-post-list"
import { PageTemplate } from "@/components/layout/page-template"
import { now } from "@/data/now"
import { messagesOf, type Messages } from "@/data/messages"
import { formatDate } from "@/lib/format"
import { getLocale } from "@/lib/i18n/server"
import { pageTitle } from "@/lib/metadata"
import type { NowPost } from "@/lib/now/schema"
import { getNowStore } from "@/lib/now/store"

export async function generateMetadata(): Promise<Metadata> {
  const messages = messagesOf(await getLocale())
  return { title: pageTitle(messages.nav.now), description: messages.now.description }
}

export default async function NowPage() {
  // 記事は POST /api/now でいつでも増えるので、ビルド時に固めずリクエストごとに読む
  await connection()
  const locale = await getLocale()
  const messages = messagesOf(locale)
  const { posts, loadError } = await loadPosts(messages.now)
  const latest = posts[0]

  return (
    <PageTemplate title={messages.nav.now}>
      <div className="max-w-4xl space-y-8">
        <p className="text-muted-foreground">
          {messages.now.intro}
          {latest && (
            <>
              {messages.now.updatedBefore}
              <time dateTime={latest.publishedAt}>{formatDate(latest.publishedAt, locale)}</time>
              {messages.now.updatedAfter}
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

        {messages.now.languageNote && <p className="text-sm text-muted-foreground">{messages.now.languageNote}</p>}

        {now.availability && (
          <Callout variant="emphasis">
            <p>{now.availability}</p>
          </Callout>
        )}

        <p className="text-sm text-muted-foreground">
          {messages.now.inspiredBefore}
          <TextLink href="https://nownownow.com/about">nownownow.com/about</TextLink>
          {messages.now.inspiredAfter}
        </p>
      </div>
    </PageTemplate>
  )
}

// 記事を読む。保存先が落ちていても (ApiError) ページは出し、文言はここ (上位) で決める
async function loadPosts(messages: Messages["now"]): Promise<{ posts: NowPost[]; loadError: string | null }> {
  const store = getNowStore()
  if (!store) return { posts: [], loadError: null }
  try {
    return { posts: await store.list(), loadError: null }
  } catch (error) {
    console.error("Failed to load now posts", error)
    return { posts: [], loadError: messages.loadError }
  }
}
