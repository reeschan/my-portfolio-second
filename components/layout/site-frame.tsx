import type React from "react"
import { Suspense } from "react"
import { cacheLife } from "next/cache"
import { BrowserTabs } from "@/components/layout/browser-tabs"
import { HtmlLang } from "@/components/layout/html-lang"
import { LocaleProvider } from "@/lib/i18n/locale-context"
import { getLocale } from "@/lib/i18n/server"
import type { Locale } from "@/lib/i18n/config"

// タブ付きのページの共通の枠 (app/(tabs)/layout.tsx が使う。ADR 0035、本文の置き場所は ADR 0038)。
// タブバーだけを Cookie の <Suspense> に入れる。本文 (children) まで入れると、ページの中身が
// <div hidden id="S:"> にしか出ず、JS を動かさないクローラーが読めなくなる
export function SiteFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col">
      <Suspense fallback={<SiteFrameChromeFallback />}>
        <LocalizedChrome />
      </Suspense>
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl">{children}</div>
      </div>
    </main>
  )
}

// Cookie から言語を読む。ここはキャッシュせず、リクエストごとに走る
async function LocalizedChrome() {
  const locale = await getLocale()
  return <CachedChrome locale={locale} />
}

// 言語ごとに作り置きするタブバー。サイト内を移っても、この部品は共通のレイアウトに置いたままなので描き直されない。
// "use cache" の部品は async でなければならない (Next.js の決まり)。ここに待つ処理は無い
// eslint-disable-next-line @typescript-eslint/require-await
async function CachedChrome({ locale }: { locale: Locale }) {
  "use cache"
  cacheLife("max")

  return (
    <LocaleProvider locale={locale}>
      {/* 言語を切り替えたときと、開発中の Strict Mode の属性の戻しに合わせて <html lang> を書き直す (PBI-009) */}
      <HtmlLang locale={locale} />
      <BrowserTabs />
    </LocaleProvider>
  )
}

// 言語を読む前の殻。タブバーとアドレスバーの場所を、同じ高さの空のガラスの帯で取っておく。
// 帯に nav の役割は付けない (言語の名前を持てないため。中身の BrowserTabs が正しい nav を出す)。
// 本文の場所はここでは取らない。本文は children が殻に出す (ADR 0038)
function SiteFrameChromeFallback() {
  return (
    <>
      <div className="glass-bar h-12 rounded-t-lg border-b border-border/20" />
      <div className="glass-bar h-10 border-b border-border/20" />
    </>
  )
}
