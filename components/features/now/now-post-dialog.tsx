"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { NowPost } from "@/lib/now/schema"
import { formatJapaneseDateTime } from "@/lib/format"
import { Markdown } from "./markdown"

type NowPostDialogProps = {
  post: NowPost | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

// 記事の全文。3D 背景がうっすら透けるよう、面と背景の暗幕をいつものダイアログより薄くする
export function NowPostDialog({ post, open, onOpenChange }: NowPostDialogProps) {
  return (
    <Dialog open={open && post !== null} onOpenChange={onOpenChange}>
      <DialogContent overlayClassName="bg-black/40" className="max-h-[90vh] max-w-3xl overflow-y-auto bg-card/70 backdrop-blur-lg">
        {post && (
          <>
            <DialogHeader>
              <DialogTitle className="pr-6 text-2xl">{post.title}</DialogTitle>
              <DialogDescription>
                <time dateTime={post.publishedAt}>{formatJapaneseDateTime(post.publishedAt)}</time>
                {post.updatedAt && (
                  <>
                    （<time dateTime={post.updatedAt}>{formatJapaneseDateTime(post.updatedAt)}</time>更新）
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <Markdown>{post.body}</Markdown>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
