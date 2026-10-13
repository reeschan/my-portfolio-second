"use client"

import { RssIcon } from "lucide-react"
import Link from "next/link"
import { useMessages } from "@/lib/i18n/locale-context"
import { cn } from "@/lib/utils"

interface RssButtonProps {
  className?: string
}

export function RssButton({ className }: RssButtonProps) {
  const messages = useMessages()

  return (
    <Link
      href="/rss.xml"
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background/60 text-muted-foreground transition-colors hover:bg-background hover:text-rss",
        className,
      )}
      aria-label={messages.layout.rss}
      title={messages.layout.rssTitle}
    >
      <RssIcon className="h-4 w-4" />
    </Link>
  )
}
