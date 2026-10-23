import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Markdown } from "@/components/common/markdown"
import { PageTemplate } from "@/components/layout/page-template"
import { SiteFrame } from "@/components/layout/site-frame"
import { messagesOf } from "@/data/messages"
import { formatDate } from "@/lib/format"
import { getLocale } from "@/lib/i18n/server"
import { pageMetadata, pageTitle, siteUrl } from "@/lib/metadata"
import { getNowPostCached } from "@/lib/now/cached"
import { excerptOf } from "@/lib/now/excerpt"
import { nowPostPath } from "@/lib/now/feed"
import { blogPostingJsonLd, postDescriptionLength, serializeJsonLd } from "@/lib/now/structured-data"

// 知らない id の 404 は proxy.ts が返す。殻の検証を外すかは PBI-015 で決める
// (instant = false では状態コードは直らない。ADR 0035)
export const instant = false

// 記事 1 件の読み込み。generateMetadata とページで同じリクエスト中に 2 回呼んでも、
// getNowPostCached が同じ id の作り置きを返すので React の cache は要らない (ADR 0030)
// 保存先が落ちたとき (ApiError) は捕まえずに投げる。空のページを 200 で返さず、5xx にする
async function loadPost(id: string) {
  const post = await getNowPostCached(id)
  if (!post) notFound()
  return post
}

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
  const { id } = await params
  const post = await loadPost(id)
  const locale = await getLocale()
  const messages = messagesOf(locale)

  return (
    // 記事のページはルートグループの外 (app/now/[id]) にあり、共通のレイアウトを使えない。
    // タブ付きの見た目を保つため、ここで SiteFrame に包む (ADR 0035)
    <SiteFrame>
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
          <Markdown headingStart={2} images={post.images} imageViewerTitle={messages.now.imageViewerTitle(post.title)}>
            {post.body}
          </Markdown>

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
    </SiteFrame>
  )
}
