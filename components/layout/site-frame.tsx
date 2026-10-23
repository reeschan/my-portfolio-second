import type React from "react"
import { Suspense } from "react"
import { cacheLife } from "next/cache"
import { BrowserTabs } from "@/components/layout/browser-tabs"
import { HtmlLang } from "@/components/layout/html-lang"
import { PanelFrameFallback } from "@/components/layout/panel-frame-fallback"
import { LocaleProvider } from "@/lib/i18n/locale-context"
import { getLocale } from "@/lib/i18n/server"
import type { Locale } from "@/lib/i18n/config"

// タブ付きのページの共通の枠 (app/(tabs)/layout.tsx が使う。ADR 0035)。
// 外側 (main) は言語にも URL にも依らないので、Cookie を読む前から出せる
export function SiteFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col">
      {/* 言語を読む部分は <Suspense> の中に閉じ込める。外で読むとルートが殻を持てなくなる */}
      <Suspense fallback={<SiteFrameFallback />}>
        <LocalizedFrame>{children}</LocalizedFrame>
      </Suspense>
    </main>
  )
}

// Cookie から言語を読む。ここはキャッシュせず、リクエストごとに走る
async function LocalizedFrame({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  return <CachedFrame locale={locale}>{children}</CachedFrame>
}

// 言語ごとに作り置きする部分。children はキャッシュの鍵にせず、そのまま差し込む (use cache の interleaving)。
// タブ付きのページの共通のレイアウトに置くので、サイト内を移ってもタブバーは描き直されない。
// "use cache" の部品は async でなければならない (Next.js の決まり)。ここに待つ処理は無い
// eslint-disable-next-line @typescript-eslint/require-await
async function CachedFrame({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  "use cache"
  cacheLife("max")

  return (
    <LocaleProvider locale={locale}>
      {/* 言語を切り替えたときと、開発中の Strict Mode の属性の戻しに合わせて <html lang> を書き直す (PBI-009) */}
      <HtmlLang locale={locale} />
      <BrowserTabs />
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl">{children}</div>
      </div>
    </LocaleProvider>
  )
}

// 言語を読む前の殻。タブバーとアドレスバーの場所を、同じ高さの空のガラスの帯で取っておく。
// 帯に nav の役割は付けない (言語の名前を持てないため。中身の BrowserTabs が正しい nav を出す)
function SiteFrameFallback() {
  return (
    <>
      <div className="glass-bar h-12 rounded-t-lg border-b border-border/20" />
      <div className="glass-bar h-10 border-b border-border/20" />
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl">
          <PanelFrameFallback />
        </div>
      </div>
    </>
  )
}
