import type React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

type TextLinkProps = {
  href: string
  className?: string
  children: React.ReactNode
}

// 本文の地の文 (muted-foreground) との色の差は 1.14:1 しかなく、色だけではリンクと分からない (WCAG 1.4.1)。
// そこで下線を常に出し、ホバーでは線を少し太くして押せることを示す
const linkClassName = "text-primary underline decoration-1 underline-offset-4 hover:decoration-2"

// 本文中のリンク。外部サイト (http で始まる) は新しいタブで開き、遷移元の情報を渡さない
export function TextLink({ href, className, children }: TextLinkProps) {
  if (/^https?:\/\//.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cn(linkClassName, className)}>
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={cn(linkClassName, className)}>
      {children}
    </Link>
  )
}
