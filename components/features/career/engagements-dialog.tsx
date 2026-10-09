import { BulletList, TagList } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import type { Engagement } from "@/data/career"

type EngagementsDialogProps = {
  title: string
  engagements: Engagement[]
}

// 経歴カードから開く「参画案件の詳細」
export function EngagementsDialog({ title, engagements }: EngagementsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="mt-3">
          参画案件の詳細
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>参画案件の詳細</DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {engagements.map((engagement) => (
            <section key={engagement.client} className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="text-base font-semibold">{engagement.client}</h3>
                {engagement.period && <span className="text-xs text-muted-foreground">{engagement.period}</span>}
              </div>
              <p className="text-sm">{engagement.summary}</p>
              {engagement.points.length > 0 && <BulletList items={engagement.points} className="space-y-1 text-sm text-muted-foreground" />}
              {engagement.tech && <TagList tags={engagement.tech} variant="muted" label="使用技術" className="pt-1" />}
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
