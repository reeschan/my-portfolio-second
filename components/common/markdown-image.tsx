"use client"

import { useRef, useState } from "react"
import { useMessages } from "@/lib/i18n/locale-context"
import { ImageViewer } from "./image-viewer"

// 記事の画像 1 枚分 (サーバー部品の Markdown から渡すので、直列化できる値だけにする)
export type MarkdownImageSource = {
  url: string
  width: number
  height: number
}

type MarkdownImageProps = {
  // テーマが明るいとき (組でなければ常に) 出す画像
  light: MarkdownImageSource
  // 組のダーク用。あればテーマで出し分ける
  dark?: MarkdownImageSource
  alt: string
  // 拡大表示の題 (「<記事の題名> の画像」)。呼び出し側で組み立てる
  viewerTitle: string
}

// 記事の本文の画像。画像そのものを「拡大する」ボタンにし、押すと共通の拡大表示を開く (お手本は /works の ArchitectureFigure)
// 文と混ざった段落の <p> の中にも置かれるので、中身は phrasing content (button・img・span) だけにする
export function MarkdownImage({ light, dark, alt, viewerTitle }: MarkdownImageProps) {
  const messages = useMessages().imageViewer
  const [viewerOpen, setViewerOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  /* eslint-disable @next/next/no-img-element -- 記事の画像は data: URL や外部の Blob の URL で、next/image では受けにくい。images.unoptimized: true なので next/image にしても最適化は無い */
  return (
    <span className="block">
      <button
        type="button"
        ref={buttonRef}
        onClick={() => setViewerOpen(true)}
        aria-label={`${messages.enlargeImage}: ${alt}`}
        className="inline-block max-w-full cursor-zoom-in rounded-md focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* 幅は本文の幅まで縮め、高さは比率で決める。縦長の図でも横にはみ出さない */}
        <img
          src={light.url}
          alt={alt}
          width={light.width}
          height={light.height}
          loading="lazy"
          decoding="async"
          className={dark ? "h-auto max-w-full dark:hidden" : "h-auto max-w-full"}
        />
        {dark && (
          <img
            src={dark.url}
            alt={alt}
            width={dark.width}
            height={dark.height}
            loading="lazy"
            decoding="async"
            className="hidden h-auto max-w-full dark:block"
          />
        )}
      </button>
      <span className="mt-2 block text-xs text-muted-foreground">{messages.enlargeHint}</span>
      <ImageViewer
        title={viewerTitle}
        image={{ light: light.url, dark: dark?.url, alt, width: light.width, height: light.height }}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        returnFocusRef={buttonRef}
      />
    </span>
  )
  /* eslint-enable @next/next/no-img-element */
}
