import type React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

type TextLinkProps = {
  href: string
  className?: string
  children: React.ReactNode
}

const linkClassName = "text-primary underline-offset-4 hover:underline"

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
