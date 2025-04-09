"use client"

import { ArchitectureDiagram } from "@/components/architecture-diagram"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface PortfolioDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PortfolioDialog({ open, onOpenChange }: PortfolioDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">ポートフォリオサイト</DialogTitle>
        </DialogHeader>
        
        {/* 概要 */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">概要</h2>
          <p className="text-muted-foreground mb-2">
            このポートフォリオは、Next.jsとReactを使用して構築された個人的なウェブサイトです。
            職業スキル、経歴、作品を視覚的に表現することを目的としています。
          </p>
          <p className="text-muted-foreground">
            スキルをレーダーチャートで表示、経歴をタイムラインで表示など、
            データ駆動の視覚化を重視したデザインとなっています。
          </p>
        </div>
        
        {/* アーキテクチャ図 */}
        <ArchitectureDiagram />
      </DialogContent>
    </Dialog>
  )
}
