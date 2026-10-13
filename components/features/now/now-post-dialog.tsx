"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { NowPost } from "@/lib/now/schema"
import { formatDate } from "@/lib/format"
import { useLocale, useMessages } from "@/lib/i18n/locale-context"
import { Markdown } from "@/components/common"

type NowPostDialogProps = {
  post: NowPost | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

// 記事の全文。3D 背景がうっすら透けるよう、面と背景の暗幕をいつものダイアログより薄くする
export function NowPostDialog({ post, open, onOpenChange }: NowPostDialogProps) {
  const locale = useLocale()
  const messages = useMessages().now

  return (
    <Dialog open={open && post !== null} onOpenChange={onOpenChange}>
      <DialogContent overlayClassName="bg-black/40" className="max-h-[90vh] max-w-3xl overflow-y-auto bg-card/70 backdrop-blur-lg">
        {post && (
          <>
            <DialogHeader>
              <DialogTitle className="pr-6 text-2xl">{post.title}</DialogTitle>
              <DialogDescription>
                <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale)}</time>
                {post.updatedAt && (
                  <>
                    {messages.dialogUpdatedBefore}
                    <time dateTime={post.updatedAt}>{formatDate(post.updatedAt, locale)}</time>
                    {messages.dialogUpdatedAfter}
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
