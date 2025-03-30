import type React from "react"
import { BrowserTabs } from "@/components/browser-tabs"

interface PageTemplateProps {
  title: string
  children: React.ReactNode
}

export function PageTemplate({ title, children }: PageTemplateProps) {
  return (
    <main className="flex min-h-screen flex-col">
      <BrowserTabs />

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-6 text-4xl font-bold tracking-tight">{title}</h1>

          <div className="rounded-lg border border-border/20 bg-card/60 p-6 shadow-lg backdrop-blur-md">{children}</div>
        </div>
      </div>
    </main>
  )
}

