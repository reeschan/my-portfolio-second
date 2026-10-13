"use client"

import Image from "next/image"
import { useState } from "react"
import { ExternalLink, Maximize2, ZoomIn, ZoomOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Work } from "@/data/works"
import { useMessages } from "@/lib/i18n/locale-context"

// 図の幅を、画面に収まる幅の何倍で出すか。1 が全体表示。D2 の図は横 2,000〜2,800px あるので、4 倍で元の大きさ前後になる
export const zoomSteps = [1, 1.5, 2, 3, 4] as const

type ArchitectureViewerProps = {
  title: string
  architecture: Work["architecture"]
  open: boolean
  onOpenChange: (open: boolean) => void
}

// アーキテクチャ図を画面いっぱいに出し、倍率を変えてスクロールで見回せるようにする (PBI-0021)
// 詳細ダイアログの中の図は幅が 850px 前後 (スマホでは 340px) しかなく、図の中の文字が読めないため
export function ArchitectureViewer({ title, architecture, open, onOpenChange }: ArchitectureViewerProps) {
  const messages = useMessages().works
  const [stepIndex, setStepIndex] = useState(0)
  const zoom = zoomSteps[stepIndex] ?? 1

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // 次に開いたときは全体表示から始める
        if (!next) setStepIndex(0)
        onOpenChange(next)
      }}
    >
      <DialogContent overlayClassName="bg-black/70" className="flex h-[95dvh] w-[95vw] max-w-[95vw] flex-col gap-3 p-4">
        <DialogHeader className="pr-8">
          <DialogTitle>{messages.viewerTitle(title)}</DialogTitle>
          <DialogDescription className="sr-only">{architecture.alt}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStepIndex((i) => i - 1)}
            disabled={stepIndex === 0}
            aria-label={messages.zoomOut}
          >
            <ZoomOut />
          </Button>
          <output aria-label={messages.zoomLevel} className="min-w-12 text-center text-sm tabular-nums text-muted-foreground">
            {Math.round(zoom * 100)}%
          </output>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStepIndex((i) => i + 1)}
            disabled={stepIndex === zoomSteps.length - 1}
            aria-label={messages.zoomIn}
          >
            <ZoomIn />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setStepIndex(0)} disabled={stepIndex === 0} aria-label={messages.zoomFit}>
            <Maximize2 />
          </Button>
          <OriginalLink architecture={architecture} label={messages.openOriginal} />
        </div>
        {/* 倍率を上げると図がはみ出すので、この枠の中を縦横にスクロールして見回す。キーボードでもスクロールできるよう枠にフォーカスを置ける */}
        <div
          role="region"
          aria-label={messages.diagramArea}
          tabIndex={0}
          className="flex min-h-0 flex-1 overflow-auto rounded-md bg-background/60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        >
          {/* 図が枠より小さいときは上下中央に置く。m-auto ならはみ出したときに上や左が切れない */}
          <div className="m-auto shrink-0" style={{ width: `${zoom * 100}%` }}>
            <Image src={architecture.light} alt={architecture.alt} width={1600} height={1000} className="h-auto w-full dark:hidden" />
            <Image src={architecture.dark} alt={architecture.alt} width={1600} height={1000} className="hidden h-auto w-full dark:block" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ブラウザの拡大縮小や保存も使えるよう、元の SVG を新しいタブで開く導線も置く。テーマに合わせて開く図を出し分ける
function OriginalLink({ architecture, label }: { architecture: Work["architecture"]; label: string }) {
  const className = "ml-auto items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
  return (
    <>
      <a href={architecture.light} target="_blank" rel="noopener noreferrer" className={`${className} inline-flex dark:hidden`}>
        <ExternalLink className="size-4" aria-hidden />
        {label}
      </a>
      <a href={architecture.dark} target="_blank" rel="noopener noreferrer" className={`${className} hidden dark:inline-flex`}>
        <ExternalLink className="size-4" aria-hidden />
        {label}
      </a>
    </>
  )
}
