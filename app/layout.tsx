import type React from "react"
import type { Metadata } from "next/dist/lib/metadata/types/metadata-interface"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { BackgroundScene } from "@/components/background-scene"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Ryuki Tobita's Portfolio",
  description: "A portfolio website showcasing my work and skills",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <BackgroundScene />
          <div className="relative min-h-screen">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  )
}



import './globals.css'