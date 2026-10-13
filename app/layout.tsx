import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { ThemeProvider } from "@/components/layout/theme-provider"
import { LocaleProvider } from "@/lib/i18n/locale-context"
import { getLocale, getMessages } from "@/lib/i18n/server"
import { pageMetadata, siteName, siteUrl } from "@/lib/metadata"
import { BackgroundScene } from "@/components/features/background/background-scene"
import { isVercelAnalyticsEnabled } from "@/lib/analytics"

// globals.css の --font-sans から参照するため CSS 変数として読み込む
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages()
  return {
    // OGP の画像や canonical の相対パスを、本番の URL で絶対 URL にする (ADR 0029)
    metadataBase: siteUrl,
    ...pageMetadata({ title: siteName, description: messages.site.description, path: "/" }),
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // 表示言語は Cookie で決まる (ADR 0026)。Client Component には LocaleProvider で配る
  const locale = await getLocale()

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.variable}>
        <LocaleProvider locale={locale}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            <BackgroundScene />
            <div className="relative min-h-screen">{children}</div>
          </ThemeProvider>
        </LocaleProvider>
        {/* 閲覧の計測は Vercel 上でだけ行う (ADR 0027) */}
        {isVercelAnalyticsEnabled() && <Analytics />}
      </body>
    </html>
  )
}
