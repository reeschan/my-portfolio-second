"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "../lib/utils"
import { motion } from "framer-motion"
import { RssButton } from "./rss-button"

type Tab = {
  name: string
  path: string
  icon?: React.ReactNode
}

const tabs: Tab[] = [
  { name: "概要", path: "/overview" },
  { name: "経歴", path: "/career" },
  { name: "スキル", path: "/skills" },
  { name: "ワーク", path: "/works" },
  { name: "チャット", path: "/chat" },
]

export function BrowserTabs() {
  const pathname = usePathname()

  return (
    <div className="relative">
      {/* タブバー */}
      <div className="flex h-12 items-center gap-1 rounded-t-lg bg-background/60 px-2 backdrop-blur-md border-b border-border/20">
        {tabs.map((tab) => {
          const isActive = pathname === tab.path

          return (
            <Link
              key={tab.path}
              href={tab.path}
              className={cn(
                "group relative flex h-9 items-center gap-2 rounded-t-md px-4 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/5 text-primary"
                  : "text-muted-foreground hover:bg-muted/30 hover:text-foreground",
              )}
            >
              {tab.icon}
              <span>{tab.name}</span>

              {isActive && (
                <motion.div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" layoutId="activeTab" />
              )}
            </Link>
          )
        })}
      </div>

      {/* アドレスバー */}
      <div className="flex h-10 items-center gap-2 border-b border-border/20 bg-background/50 px-4 backdrop-blur-md">
        <div className="flex h-7 w-full items-center rounded-full bg-background/60 px-3 text-xs text-muted-foreground">
          myportfolio.vercel.app{pathname}
        </div>
        <RssButton />
      </div>
    </div>
  )
}

