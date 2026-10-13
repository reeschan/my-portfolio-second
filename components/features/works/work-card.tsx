"use client"

import Image from "next/image"
import { TagList } from "@/components/common"
import { useMessages } from "@/lib/i18n/locale-context"
import { cn } from "@/lib/utils"
import type { Work } from "@/data/works"

type WorkCardProps = {
  work: Work
  // 渡したときだけカード全体を押せるようにする (詳細ダイアログを開く)
  onSelect?: () => void
  // 1 枚目は画面の上に出るので先に読み込む (LCP 対策)
  priority?: boolean
}

// 作品 1 件のカード。押せる場合は見出しの中のボタンをカード全体に広げ、キーボードでも開けるようにする
export function WorkCard({ work, onSelect, priority }: WorkCardProps) {
  const interactive = !!onSelect
  const messages = useMessages().works

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-lg border border-border/50 bg-background/50 transition-all",
        interactive ? "hover:-translate-y-1 hover:shadow-lg focus-within:ring-2 focus-within:ring-ring" : "hover:shadow-md",
      )}
    >
      {/* 図は横長で白や黒の地なので、切り取らず枠に収める。ライト / ダークは dark: で出し分ける */}
      <div className="relative h-48 w-full bg-background/60 p-2">
        <Image
          src={work.architecture.light}
          alt={work.architecture.alt}
          fill
          loading={priority ? "eager" : undefined}
          className={cn("object-contain dark:hidden", interactive && "transition-transform hover:scale-105")}
        />
        <Image
          src={work.architecture.dark}
          alt={work.architecture.alt}
          fill
          loading={priority ? "eager" : undefined}
          className={cn("hidden object-contain dark:block", interactive && "transition-transform hover:scale-105")}
        />
      </div>
      <div className="p-4">
        <h3 className="text-lg font-medium">
          {interactive ? (
            <button type="button" onClick={onSelect} className="text-left after:absolute after:inset-0 focus:outline-hidden">
              {work.title}
            </button>
          ) : (
            work.title
          )}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">{work.description}</p>
        <TagList tags={work.tech} label={messages.tech} variant="muted" className="mt-3" />
      </div>
    </article>
  )
}
