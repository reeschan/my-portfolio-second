import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { cacheLife } from "next/cache"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { ThemeProvider } from "@/components/layout/theme-provider"
import { messagesOf } from "@/data/messages"
import type { Locale } from "@/lib/i18n/config"
import { htmlLangScript } from "@/lib/i18n/html-lang"
import { getLocale } from "@/lib/i18n/server"
import { pageMetadata, siteName, siteUrl } from "@/lib/metadata"
import { serializeJsonLd } from "@/lib/now/structured-data"
import { siteGraphJsonLd } from "@/lib/structured-data"
import { BackgroundScene } from "@/components/features/background/background-scene"
import { isVercelAnalyticsEnabled } from "@/lib/analytics"

// globals.css の --font-sans から参照するため CSS 変数として読み込む
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export async function generateMetadata(): Promise<Metadata> {
  return siteMetadata(await getLocale())
}

// 言語ごとに作り置きする。中身は data/ の固定の値なので max
// eslint-disable-next-line @typescript-eslint/require-await
async function siteMetadata(locale: Locale): Promise<Metadata> {
  "use cache"
  cacheLife("max")
  const messages = messagesOf(locale)
  return {
    // OGP の画像や canonical の相対パスを、本番の URL で絶対 URL にする (ADR 0029)。
    // キャッシュの戻り値には URL の実体を載せられないので、同じ URL を文字列で渡す
    metadataBase: siteUrl.toString(),
    ...pageMetadata({ title: siteName, description: messages.site.description, path: "/" }),
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // ルートのレイアウトは Cookie を読まない (ADR 0035)。表示言語はタブ付きの共通の枠 (SiteFrame) と、
  // タブのないトップのページがそれぞれ <Suspense> の中で読んで配る
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        {/* 描く前に Cookie の言語へ <html lang> を合わせる。ルートのレイアウトが Cookie を読まないので、
            英語の閲覧者の lang もここで en にする (PBI-009)。CSP は frame-ancestors だけなので nonce は要らない */}
        <script dangerouslySetInnerHTML={{ __html: htmlLangScript() }} />
      </head>
      <body className={inter.variable}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <BackgroundScene />
          <div className="relative min-h-screen">{children}</div>
        </ThemeProvider>
        {/* 持ち主 (Person) とサイト (WebSite) を全ページに出す。ページ側はこの @id を指す (lib/structured-data.ts) */}
        {/* serializeJsonLd が < をエスケープ済み (lib/now/structured-data.ts、Next.js の JSON-LD のガイド) */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(siteGraphJsonLd()) }} />
        {/* 閲覧の計測は Vercel 上でだけ行う (ADR 0027) */}
        {isVercelAnalyticsEnabled() && <Analytics />}
      </body>
    </html>
  )
}
