"use client"

import { Section } from "@/components/common"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArchitectureDiagram } from "./architecture-diagram"

interface WorkDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// 作品「ポートフォリオサイト」の詳細。作品を増やして詳細が要るようになったら、作品ごとに中身を切り替える
export function WorkDetailDialog({ open, onOpenChange }: WorkDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">ポートフォリオサイト</DialogTitle>
        </DialogHeader>

        <Section title="概要">
          <p className="mb-2 text-muted-foreground">
            このポートフォリオは、Next.jsとReactを使用して構築された個人的なウェブサイトです。
            職業スキル、経歴、作品を視覚的に表現することを目的としています。
          </p>
          <p className="text-muted-foreground">
            スキルをレーダーチャートで表示、経歴をタイムラインで表示など、 データ駆動の視覚化を重視したデザインとなっています。
          </p>
        </Section>

        <ArchitectureDiagram />
      </DialogContent>
    </Dialog>
  )
}
