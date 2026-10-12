"use client"

import Image from "next/image"
import { Markdown, Section, TagList, TextLink } from "@/components/common"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Work } from "@/data/works"

type WorkDetailDialogProps = {
  work: Work | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

// 作品の詳細。/now の記事のダイアログと同じく、3D 背景がうっすら透けるよう面と暗幕を薄くする
export function WorkDetailDialog({ work, open, onOpenChange }: WorkDetailDialogProps) {
  return (
    <Dialog open={open && work !== null} onOpenChange={onOpenChange}>
      <DialogContent overlayClassName="bg-black/40" className="max-h-[90vh] max-w-4xl overflow-y-auto bg-card/70 backdrop-blur-lg">
        {work && (
          <>
            <DialogHeader>
              <DialogTitle className="pr-6 text-2xl">{work.title}</DialogTitle>
              <DialogDescription>{work.description}</DialogDescription>
            </DialogHeader>
            <TagList tags={work.tech} label="使用技術" variant="muted" />
            <RepositoryLine repository={work.repository} />
            <Markdown>{work.body}</Markdown>
            <Section title="アーキテクチャ">
              <ArchitectureFigure architecture={work.architecture} />
            </Section>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// 公開ならリンク、非公開なら閲覧者に 404 を見せないよう、リンクを出さず非公開と書く
function RepositoryLine({ repository }: { repository: Work["repository"] }) {
  if (repository.visibility === "private") {
    return <p className="text-sm text-muted-foreground">リポジトリは非公開</p>
  }
  return (
    <p className="text-sm text-muted-foreground">
      リポジトリ: <TextLink href={repository.url}>{repository.url.replace(/^https:\/\//, "")}</TextLink>
    </p>
  )
}

// サイトのテーマは <html> の dark クラスで決まるので、dark: で 2 枚を出し分ける (隠れた方は display: none で読み上げにも出ない)
function ArchitectureFigure({ architecture }: { architecture: Work["architecture"] }) {
  return (
    <figure>
      <Image src={architecture.light} alt={architecture.alt} width={1600} height={1000} className="h-auto w-full dark:hidden" />
      <Image src={architecture.dark} alt={architecture.alt} width={1600} height={1000} className="hidden h-auto w-full dark:block" />
    </figure>
  )
}
