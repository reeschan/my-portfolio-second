"use client"

import { useState } from "react"
import { works } from "@/data/works"
import { WorkCard } from "./work-card"
import { WorkDetailDialog } from "./work-detail-dialog"

// 作品カードの一覧と、詳細ダイアログの開閉
export function WorkGallery() {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        {works.map((work, i) => (
          <WorkCard
            key={work.id}
            work={work}
            priority={i === 0}
            onSelect={work.hasDetail ? () => setDialogOpen(true) : undefined}
          />
        ))}
      </div>
      <WorkDetailDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}
