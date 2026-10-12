import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/layout/theme-provider"
import { LocaleProvider } from "@/lib/i18n/locale-context"
import { getLocale } from "@/lib/i18n/server"
import { BackgroundScene } from "@/components/features/background/background-scene"

// globals.css の --font-sans から参照するため CSS 変数として読み込む
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "Ryuki Tobita's Portfolio",
  description: "A portfolio website showcasing my work and skills",
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
      </body>
    </html>
  )
}
