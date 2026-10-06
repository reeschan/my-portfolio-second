import Image from "next/image"
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

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-lg border border-border/50 bg-background/50 transition-all",
        interactive ? "hover:-translate-y-1 hover:shadow-lg focus-within:ring-2 focus-within:ring-ring" : "hover:shadow-md",
      )}
    >
      <div className="relative h-48 w-full">
        <Image
          src={work.image.src}
          alt={work.image.alt}
          fill
          loading={priority ? "eager" : undefined}
          className={cn("object-cover", interactive && "transition-transform hover:scale-105")}
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
      </div>
    </article>
  )
}
