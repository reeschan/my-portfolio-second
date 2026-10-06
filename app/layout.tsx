import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/layout/theme-provider"
import { AnnouncementBanner } from "@/components/layout/announcement-banner"
import { BackgroundScene } from "@/components/features/background/background-scene"

// globals.css の --font-sans から参照するため CSS 変数として読み込む
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "Ryuki Tobita's Portfolio",
  description: "A portfolio website showcasing my work and skills",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={inter.variable}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <BackgroundScene />
          <div className="relative min-h-screen">
            <AnnouncementBanner />
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
