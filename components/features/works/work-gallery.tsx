"use client"

import { useState } from "react"
import { worksByLocale } from "@/data/localized"
import type { Work } from "@/data/works"
import { useLocale } from "@/lib/i18n/locale-context"
import { WorkCard } from "./work-card"
import { WorkDetailDialog } from "./work-detail-dialog"

// 作品カードの一覧と、詳細ダイアログの開閉
export function WorkGallery() {
  // 閉じるアニメーションの間も中身を出しておくため、開閉と選んだ作品を分けて持つ
  const [selected, setSelected] = useState<Work | null>(null)
  const [open, setOpen] = useState(false)
  const works = worksByLocale[useLocale()]

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        {works.map((work, i) => (
          <WorkCard
            key={work.id}
            work={work}
            priority={i === 0}
            onSelect={() => {
              setSelected(work)
              setOpen(true)
            }}
          />
        ))}
      </div>
      <WorkDetailDialog work={selected} open={open} onOpenChange={setOpen} />
    </>
  )
}
