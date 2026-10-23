import type { Metadata } from "next"
import { cacheLife } from "next/cache"
import { Callout, TextLink } from "@/components/common"
import { NowPostList } from "@/components/features/now/now-post-list"
import { TabPageTemplate } from "@/components/layout/tab-page-template"
import { now } from "@/data/now"
import { messagesOf, type Messages } from "@/data/messages"
import { formatDate } from "@/lib/format"
import type { Locale } from "@/lib/i18n/config"
import { getLocale } from "@/lib/i18n/server"
import { pageMetadata, pageTitle } from "@/lib/metadata"
import { listNowPostsCached } from "@/lib/now/cached"
import type { NowPost } from "@/lib/now/schema"

export async function generateMetadata(): Promise<Metadata> {
  return nowMetadata(await getLocale())
}

// 言語ごとに作り置きする。題名と説明は data/messages の固定の値なので max (ADR 0035)。
// "use cache" の関数は async でなければならない (Next.js の決まり) が、ここに待つ処理は無い
// eslint-disable-next-line @typescript-eslint/require-await
async function nowMetadata(locale: Locale): Promise<Metadata> {
  "use cache"
  cacheLife("max")
  const messages = messagesOf(locale)
  return pageMetadata({ title: pageTitle(messages.nav.now), description: messages.now.description, path: "/now" })
}

// 見出しとパネルは殻に置き、言語と記事に依る本文だけをパネルの中で待つ (ADR 0036)
export default function NowPage() {
  return (
    <TabPageTemplate id="now">
      <NowBody />
    </TabPageTemplate>
  )
}

async function NowBody() {
  const locale = await getLocale()
  // 記事の読み込みはキャッシュの外で行い、失敗したときの文言はここ (上位) で決める。
  // listNowPostsCached が投げた結果は作り置きされないので、次の要求でやり直せる
  const { posts, loadError } = await loadPosts(messagesOf(locale).now)
  return <NowContent locale={locale} posts={posts} loadError={loadError} />
}

type NowContentProps = {
  locale: Locale
  // 新しい順に並べ済みのもの (lib/now/cached.ts)
  posts: NowPost[]
  loadError: string | null
}

// 言語と記事の一覧を作り置きの鍵にする。記事が変われば引数が変わるので、古い中身は使われない。
// 投稿の直後は API の revalidateTag が記事の作り置きを捨て、この部品も新しい一覧で描き直される。
// stale を 5 分にして App Shell に入れる (ADR 0035)。別のインスタンスに残った古い作り置きの上限も、
// 記事の作り置き (lib/now/cached.ts) と同じ 5 分に揃える。
// "use cache" の部品は async でなければならない (Next.js の決まり) が、ここに待つ処理は無い
// eslint-disable-next-line @typescript-eslint/require-await
async function NowContent({ locale, posts, loadError }: NowContentProps) {
  "use cache"
  cacheLife({ stale: 300, revalidate: 300, expire: 86400 })

  const messages = messagesOf(locale)
  const latest = posts[0]

  return (
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
  )
}

// 記事を読む。保存先が落ちていても (ApiError) ページは出し、文言はここ (上位) で決める
async function loadPosts(messages: Messages["now"]): Promise<{ posts: NowPost[]; loadError: string | null }> {
  try {
    return { posts: await listNowPostsCached(), loadError: null }
  } catch (error) {
    console.error("Failed to load now posts", error)
    return { posts: [], loadError: messages.loadError }
  }
}
