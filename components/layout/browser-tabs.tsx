"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"
import { displayHost, navItems } from "@/lib/navigation"
import { RssButton } from "@/components/layout/rss-button"

// ブラウザのタブとアドレスバーを模したナビゲーション
export function BrowserTabs() {
  const pathname = usePathname()

  return (
    <div className="relative">
      <TabBar pathname={pathname} />
      <AddressBar pathname={pathname} />
    </div>
  )
}

function TabBar({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="ページ切り替え"
      className="glass-bar flex h-12 items-center gap-1 overflow-x-auto rounded-t-lg border-b border-border/20 px-2"
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group relative flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-t-md px-4 text-sm font-medium transition-colors",
              isActive ? "bg-primary/5 text-primary" : "text-muted-foreground hover:bg-muted/30 hover:text-foreground",
            )}
          >
            <span>{item.label}</span>
            {isActive && <motion.div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" layoutId="activeTab" />}
          </Link>
        )
      })}
    </nav>
  )
}

function AddressBar({ pathname }: { pathname: string }) {
  return (
    <div className="glass-bar flex h-10 items-center gap-2 border-b border-border/20 px-4">
      <div className="flex h-7 w-full items-center rounded-full bg-background/60 px-3 text-xs text-muted-foreground">
        {displayHost}
        {pathname}
      </div>
      <RssButton />
    </div>
  )
}
