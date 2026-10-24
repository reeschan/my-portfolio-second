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
import { localizeNowPost, NowPostNotice } from "@/lib/now/localize"
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

// 記事ごとの metadata。題名・説明は表示言語で出し分けた記事の中身から、canonical は /now/<id> から作る (ADR 0029・0030)
export async function generateMetadata({ params }: NowPostPageProps): Promise<Metadata> {
  const { id } = await params
  const post = await loadPost(id)
  // 出し分けは作り置きの外で行う (作り置きの鍵を言語で増やさない。ADR 0035)
  const localized = localizeNowPost(post, await getLocale())
  return pageMetadata({
    title: pageTitle(localized.title),
    description: excerptOf(localized.body, postDescriptionLength),
    path: nowPostPath(post.id),
    article: { publishedTime: post.publishedAt, modifiedTime: post.updatedAt },
  })
}

export default async function NowPostPage({ params }: NowPostPageProps) {
  const { id } = await params
  const post = await loadPost(id)
  const locale = await getLocale()
  const messages = messagesOf(locale)
  // 題名・本文・断り書きは一覧のカードと同じ関数で決める (表示の食い違いを防ぐ)
  const localized = localizeNowPost(post, locale)
  // 英語の画面で日本語のまま出す記事だけ、読み上げソフトが日本語として読めるよう本文を lang="ja" で包む
  const contentLang = locale === "en" && localized.lang === "ja" ? "ja" : undefined

  return (
    // 記事のページはルートグループの外 (app/now/[id]) にあり、共通のレイアウトを使えない。
    // タブ付きの見た目を保つため、ここで SiteFrame に包む (ADR 0035)
    <SiteFrame>
      <PageTemplate title={localized.title}>
        <article className="max-w-3xl space-y-6">
          <div className="space-y-1">
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
              {/* 自動訳の記事は、持ち主の英語力と取り違えないよう日付の横に断り書きを添える */}
              {localized.notice === NowPostNotice.machineTranslated && (
                <>
                  {" "}
                  <span>{messages.now.machineTranslatedNote}</span>
                </>
              )}
            </p>
            {/* 英語版が無い記事は、表示の不具合と取り違えないよう日付の下に日本語であることを断る */}
            {localized.notice === NowPostNotice.japaneseOnly && (
              <p className="text-sm text-muted-foreground">{messages.now.japaneseOnlyNote}</p>
            )}
          </div>

          <div lang={contentLang}>
            {/* 題名が h1 なので、本文の # は h2 から始める。拡大表示の題も出し分けた題名を使う */}
            <Markdown headingStart={2} images={post.images} imageViewerTitle={messages.now.imageViewerTitle(localized.title)}>
              {localized.body}
            </Markdown>
          </div>

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
            __html: serializeJsonLd(blogPostingJsonLd({ post, localized, url: new URL(nowPostPath(post.id), siteUrl).href })),
          }}
        />
      </PageTemplate>
    </SiteFrame>
  )
}
