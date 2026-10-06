import type React from "react"
import { cn } from "@/lib/utils"

type SectionProps = {
  title: React.ReactNode
  // 見出しの大きさ。ページ直下の区切りは lg、ページ内の小見出しは md
  size?: "md" | "lg"
  className?: string
  children: React.ReactNode
}

// ページ本文の 1 区切り。h1 はページの枠 (PageTemplate) が持つので、ここは常に h2
export function Section({ title, size = "md", className, children }: SectionProps) {
  return (
    <section className={className}>
      <h2 className={cn("font-semibold", size === "lg" ? "mb-4 text-2xl" : "mb-3 text-xl")}>{title}</h2>
      {children}
    </section>
  )
}
