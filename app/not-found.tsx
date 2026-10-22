import type { Metadata } from "next"
import { TextLink } from "@/components/common"
import { PageTemplate } from "@/components/layout/page-template"
import { getMessages } from "@/lib/i18n/server"
import { pageTitle } from "@/lib/metadata"

// 404 の metadata。ルートのレイアウト (app/layout.tsx) がトップの canonical・og:url・説明文を全ページに出すので、
// ここで打ち消す。404 を正のページと取り違えさせないため (docs/specs/seo-stage2.md)
export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages()
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
export default async function NotFound() {
  const messages = await getMessages()
  const text = messages.notFound

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
