"use client"

import { useState, type RefObject } from "react"
import { ExternalLink, Maximize2, ZoomIn, ZoomOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useMessages } from "@/lib/i18n/locale-context"

// 画像の幅を、画面に収まる幅の何倍で出すか。1 が全体表示。上限の 4 倍は、横に長い図が元の大きさ前後で読めるようにするため (例えば横 2,000〜2,800px の D2 の図)
export const zoomSteps = [1, 1.5, 2, 3, 4] as const

// width/height が分からない画像に付ける既定の大きさ。/works の図に付けていた値と同じ
const defaultWidth = 1600
const defaultHeight = 1000

export type ImageViewerImage = {
  light: string
  // テーマが暗いときに出す画像。無ければ light を 1 枚だけ出す
  dark?: string
  alt: string
  width?: number
  height?: number
}

type ImageViewerProps = {
  // ダイアログの題。呼び出し側で組み立てたものをそのまま出す
  title: string
  image: ImageViewerImage
  open: boolean
  onOpenChange: (open: boolean) => void
  // 閉じたときにフォーカスを戻す先。DialogTrigger を使わずに開くので、Radix は戻し先を知らない
  returnFocusRef: RefObject<HTMLElement | null>
  // 「元の画像を新しいタブで開く」の文言を差し替える。/works は従来の「元の図を…」を渡す
  openOriginalLabel?: string
}

// 画像を画面いっぱいに出し、倍率を変えてスクロールで見回せるようにする (PBI-0021 の /works の図から共通化)
// ダイアログや記事の幅では画像の中の文字が読めないため
export function ImageViewer({ title, image, open, onOpenChange, returnFocusRef, openOriginalLabel }: ImageViewerProps) {
  const messages = useMessages().imageViewer
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
      <DialogContent
        overlayClassName="bg-black/70"
        className="flex h-[95dvh] w-[95vw] max-w-[95vw] flex-col gap-3 p-4"
        onCloseAutoFocus={(event) => {
          // 既定の動きではフォーカスが呼び出し元のダイアログの外 (body) に落ちるので、開いたボタンに戻す
          event.preventDefault()
          returnFocusRef.current?.focus()
        }}
      >
        <DialogHeader className="pr-8">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{image.alt}</DialogDescription>
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
          <OriginalLinks image={image} label={openOriginalLabel ?? messages.openOriginal} />
        </div>
        {/* 倍率を上げると画像がはみ出すので、この枠の中を縦横にスクロールして見回す。キーボードでもスクロールできるよう枠にフォーカスを置ける */}
        <div
          role="region"
          aria-label={messages.diagramArea}
          tabIndex={0}
          className="flex min-h-0 flex-1 overflow-auto rounded-md bg-background/60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        >
          {/* 画像が枠より小さいときは上下中央に置く。m-auto ならはみ出したときに上や左が切れない */}
          <div className="m-auto shrink-0" style={{ width: `${zoom * 100}%` }}>
            <ThemedImage image={image} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// サイトのテーマは <html> の dark クラスで決まるので、dark があれば dark: で 2 枚を出し分ける (隠れた方は display: none で読み上げにも出ない)
function ThemedImage({ image }: { image: ImageViewerImage }) {
  const width = image.width ?? defaultWidth
  const height = image.height ?? defaultHeight
  /* eslint-disable @next/next/no-img-element -- 記事の画像は data: URL や外部の Blob の URL で、next/image では受けにくい。images.unoptimized: true なので next/image にしても最適化は無い */
  if (!image.dark) {
    return <img src={image.light} alt={image.alt} width={width} height={height} className="h-auto w-full" />
  }
  return (
    <>
      <img src={image.light} alt={image.alt} width={width} height={height} className="h-auto w-full dark:hidden" />
      <img src={image.dark} alt={image.alt} width={width} height={height} className="hidden h-auto w-full dark:block" />
    </>
  )
  /* eslint-enable @next/next/no-img-element */
}

// 新しいタブで開いてよい URL か。data: URL はブラウザが新しいタブで開くのを拒むので、https: とサイト内のパスだけにする
function canOpenOriginal(url: string): boolean {
  return url.startsWith("https:") || url.startsWith("/")
}

// ブラウザの拡大縮小や保存も使えるよう、元の画像を新しいタブで開く導線も置く。テーマに合わせて開く画像を出し分ける
function OriginalLinks({ image, label }: { image: ImageViewerImage; label: string }) {
  const className = "ml-auto items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
  if (!image.dark) {
    return canOpenOriginal(image.light) ? <OriginalLink href={image.light} label={label} className={`${className} inline-flex`} /> : null
  }
  return (
    <>
      {canOpenOriginal(image.light) && <OriginalLink href={image.light} label={label} className={`${className} inline-flex dark:hidden`} />}
      {canOpenOriginal(image.dark) && <OriginalLink href={image.dark} label={label} className={`${className} hidden dark:inline-flex`} />}
    </>
  )
}

function OriginalLink({ href, label, className }: { href: string; label: string; className: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      <ExternalLink className="size-4" aria-hidden />
      {label}
    </a>
  )
}
