"use client"

import * as React from "react"
import { RssIcon } from "lucide-react"
import Link from "next/link"
import { cn } from "../lib/utils"

interface RssButtonProps {
  className?: string
}

export function RssButton({ className }: RssButtonProps) {
  return (
    <Link
      href="/rss.xml"
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full bg-background/60 text-muted-foreground transition-colors hover:bg-background hover:text-orange-500",
        className
      )}
      aria-label="RSSフィード"
      title="RSSフィードを購読"
    >
      <RssIcon className="h-4 w-4" />
    </Link>
  )
}
