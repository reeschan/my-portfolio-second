import type { Metadata } from "next"
import { Suspense } from "react"
import { cacheLife } from "next/cache"
import { TextLink } from "@/components/common"
import { PageTemplate } from "@/components/layout/page-template"
import { PanelFrameFallback } from "@/components/layout/panel-frame-fallback"
import { SiteFrame } from "@/components/layout/site-frame"
import { messagesOf } from "@/data/messages"
import type { Locale } from "@/lib/i18n/config"
import { getLocale } from "@/lib/i18n/server"
import { pageTitle } from "@/lib/metadata"

export async function generateMetadata(): Promise<Metadata> {
  return notFoundMetadata(await getLocale())
}

// 404 の metadata。言語ごとに作り置きする。中身は data/ の固定の値なので max。
// ルートのレイアウト (app/layout.tsx) がトップの canonical・og:url・説明文を全ページに出すので、
// ここで打ち消す。404 を正のページと取り違えさせないため (docs/specs/seo-stage2.md)
// eslint-disable-next-line @typescript-eslint/require-await
async function notFoundMetadata(locale: Locale): Promise<Metadata> {
  "use cache"
  cacheLife("max")
  const messages = messagesOf(locale)
  return {
    title: pageTitle(messages.notFound.title),
    description: messages.notFound.body,
    // canonical は null を渡して消す (Metadata の型が null を許す)
    alternates: { canonical: null },
    // openGraph は親と浅く混ざるので、url を消すには丸ごと置き換える。url: null で og:url を出さない
    openGraph: { title: pageTitle(messages.notFound.title), description: messages.notFound.body, url: null },
    // 404 は索引に載せない。Next.js も 404 には noindex を足すが、意図をコードにも残しておく
    robots: { index: false, follow: true },
  }
}

// 存在しない URL と、知らない id の記事の URL (app/now/[id]/page.tsx の notFound()) の両方で出る。
// タブ付きの枠の中に戻り先を並べ、迷い込んだ閲覧者がサイトの中に戻れるようにする
export default function NotFound() {
  // 404 の本文は言語に依るので、言語を読む部分を <Suspense> の中に閉じ込める。外で読むと /_not-found の殻が
  // 作れず、ビルドが runtime data during prerendering で落ちる (PBI-015)
  return (
    // 404 はタブ付きのページの外 (app/not-found.tsx) にあるので、見た目を揃えるために自分で SiteFrame で包む
    <SiteFrame>
      <Suspense fallback={<PanelFrameFallback />}>
        <NotFoundLocalized />
      </Suspense>
    </SiteFrame>
  )
}

// Cookie から表示言語を読む部分。ここだけがリクエストごとに走る
async function NotFoundLocalized() {
  return <NotFoundContent locale={await getLocale()} />
}

// 言語ごとに作り置きする。SiteFrame は殻なのでキャッシュの部品の中には入れず、PageTemplate から下だけを描く
// eslint-disable-next-line @typescript-eslint/require-await
async function NotFoundContent({ locale }: { locale: Locale }) {
  "use cache"
  cacheLife("max")
  const text = messagesOf(locale).notFound

  return (
    <PageTemplate title={text.heading}>
      <div className="space-y-6">
        <p className="text-muted-foreground">{text.body}</p>
        <ul className="space-y-3">
          <li>
            <TextLink href="/">{text.home}</TextLink>
          </li>
          <li>
            <TextLink href="/now">{text.now}</TextLink>
          </li>
          <li>
            <TextLink href="/works">{text.works}</TextLink>
          </li>
        </ul>
      </div>
    </PageTemplate>
  )
}
