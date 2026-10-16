import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { cache } from "react"
import { Markdown } from "@/components/common"
import { PageTemplate } from "@/components/layout/page-template"
import { messagesOf } from "@/data/messages"
import { formatDate } from "@/lib/format"
import { getLocale } from "@/lib/i18n/server"
import { pageMetadata, pageTitle, siteUrl } from "@/lib/metadata"
import { excerptOf } from "@/lib/now/excerpt"
import { nowPostPath } from "@/lib/now/feed"
import { blogPostingJsonLd, postDescriptionLength, serializeJsonLd } from "@/lib/now/structured-data"
import { getNowStore } from "@/lib/now/store"

// 記事 1 件の読み込み。generateMetadata とページで同じリクエスト中に 2 回読まないよう cache で包む (ADR 0030)
// 保存先が落ちたとき (ApiError) は捕まえずに投げる。空のページを 200 で返さず、5xx にする
const loadPost = cache(async (id: string) => {
  const store = getNowStore()
  const post = store ? await store.get(id) : null
  if (!post) notFound()
  return post
})

type NowPostPageProps = {
  params: Promise<{ id: string }>
}

// 記事ごとの metadata。題名・説明は記事の中身から、canonical は /now/<id> から作る (ADR 0029・0030)
export async function generateMetadata({ params }: NowPostPageProps): Promise<Metadata> {
  const { id } = await params
  const post = await loadPost(id)
  return pageMetadata({
    title: pageTitle(post.title),
    description: excerptOf(post.body, postDescriptionLength),
    path: nowPostPath(post.id),
    article: { publishedTime: post.publishedAt, modifiedTime: post.updatedAt },
  })
}

export default async function NowPostPage({ params }: NowPostPageProps) {
  // 記事は POST /api/now でいつでも増えるので、ビルド時に固めずリクエストごとに読む
  await connection()
  const { id } = await params
  const post = await loadPost(id)
  const locale = await getLocale()
  const messages = messagesOf(locale)

  return (
    <PageTemplate title={post.title}>
      <article className="max-w-3xl space-y-6">
        <p className="text-sm text-muted-foreground">
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale)}</time>
          {/* 出し方は一覧のダイアログ (now-post-dialog.tsx) と同じ。更新日があるときだけ添える */}
          {post.updatedAt && (
            <>
              {messages.now.dialogUpdatedBefore}
              <time dateTime={post.updatedAt}>{formatDate(post.updatedAt, locale)}</time>
              {messages.now.dialogUpdatedAfter}
            </>
          )}
        </p>

        {/* 題名が h1 なので、本文の # は h2 から始める */}
        <Markdown headingStart={2}>{post.body}</Markdown>

        <p>
          <Link href="/now" className="text-primary underline-offset-4 hover:underline">
            {messages.now.backToList}
          </Link>
        </p>
      </article>

      {/* 検索エンジンに記事の構造を渡す。serializeJsonLd が < をエスケープ済み (lib/now/structured-data.ts) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(blogPostingJsonLd({ post, url: new URL(nowPostPath(post.id), siteUrl).href })),
        }}
      />
    </PageTemplate>
  )
}
