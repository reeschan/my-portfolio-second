"use client"

import Image from "next/image"
import dynamic from "next/dynamic"
import { useRef, useState } from "react"
import { ImageViewer, Section, TagList, TextLink } from "@/components/common"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Work } from "@/data/works"
import { useMessages } from "@/lib/i18n/locale-context"

// react-markdown と remark-gfm は重いので、作品の詳細を開いたときだけ読む (PBI-010)。
// ダイアログは開いてから読むので、読み込み中は本文の場所を取るだけの控えにして、ずれを小さくする
const Markdown = dynamic(() => import("@/components/common/markdown").then((mod) => mod.Markdown), {
  loading: () => <div className="h-24 w-full animate-pulse rounded-md bg-muted/20" />,
})

type WorkDetailDialogProps = {
  work: Work | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

// 作品の詳細。/now の記事のダイアログと同じく、3D 背景がうっすら透けるよう面と暗幕を薄くする
export function WorkDetailDialog({ work, open, onOpenChange }: WorkDetailDialogProps) {
  const messages = useMessages().works

  return (
    <Dialog open={open && work !== null} onOpenChange={onOpenChange}>
      <DialogContent overlayClassName="bg-black/40" className="max-h-[90vh] max-w-4xl overflow-y-auto bg-card/70 backdrop-blur-lg">
        {work && (
          <>
            <DialogHeader>
              <DialogTitle className="pr-6 text-2xl">{work.title}</DialogTitle>
              <DialogDescription>{work.description}</DialogDescription>
            </DialogHeader>
            <TagList tags={work.tech} label={messages.tech} variant="muted" />
            <RepositoryLine repository={work.repository} />
            <Markdown>{work.body}</Markdown>
            <Section title={messages.architecture}>
              <ArchitectureFigure title={work.title} architecture={work.architecture} />
            </Section>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// 公開ならリンク、非公開なら閲覧者に 404 を見せないよう、リンクを出さず非公開と書く
function RepositoryLine({ repository }: { repository: Work["repository"] }) {
  const messages = useMessages().works
  if (repository.visibility === "private") {
    return <p className="text-sm text-muted-foreground">{messages.privateRepository}</p>
  }
  return (
    <p className="text-sm text-muted-foreground">
      {messages.repository}
      <TextLink href={repository.url}>{repository.url.replace(/^https:\/\//, "")}</TextLink>
    </p>
  )
}

// サイトのテーマは <html> の dark クラスで決まるので、dark: で 2 枚を出し分ける (隠れた方は display: none で読み上げにも出ない)
// ダイアログの幅では図の文字が読めないので、押すと画面いっぱいの拡大表示を開く (PBI-0021)
function ArchitectureFigure({ title, architecture }: { title: string; architecture: Work["architecture"] }) {
  const messages = useMessages().works
  const [viewerOpen, setViewerOpen] = useState(false)
  const enlargeButtonRef = useRef<HTMLButtonElement>(null)

  return (
    <figure>
      <button
        type="button"
        ref={enlargeButtonRef}
        onClick={() => setViewerOpen(true)}
        aria-label={messages.enlarge}
        className="block w-full cursor-zoom-in rounded-md focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Image src={architecture.light} alt={architecture.alt} width={1600} height={1000} className="h-auto w-full dark:hidden" />
        <Image src={architecture.dark} alt={architecture.alt} width={1600} height={1000} className="hidden h-auto w-full dark:block" />
      </button>
      <figcaption className="mt-2 text-center text-xs text-muted-foreground">{messages.enlargeHint}</figcaption>
      <ImageViewer
        title={messages.viewerTitle(title)}
        image={architecture}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        returnFocusRef={enlargeButtonRef}
        openOriginalLabel={messages.openOriginal}
      />
    </figure>
  )
}
