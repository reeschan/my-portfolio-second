"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface AnnouncementBannerProps {
  className?: string
}

export function AnnouncementBanner({ className }: AnnouncementBannerProps) {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  return (
    <div
      role="region"
      aria-label="お知らせ"
      className={cn("relative border-b border-primary/20 bg-primary/10 px-4 py-2 text-center text-sm backdrop-blur-md", className)}
    >
      <p className="font-medium">🚧 サイトは現在準備中です。5月に完成予定です。ご期待ください！ 🚧</p>
      <button
        type="button"
        onClick={() => setIsVisible(false)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-background/50 hover:text-foreground"
        aria-label="お知らせを閉じる"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
