import { AwardIcon, BriefcaseIcon, GraduationCapIcon, WrenchIcon } from "lucide-react"
import { TagList } from "@/components/common"
import { Badge } from "@/components/ui/badge"
import { careerData, type CareerEntry, type CareerEntryType } from "@/data/career"
import { EngagementsDialog } from "./engagements-dialog"

const icons: Record<CareerEntryType, typeof BriefcaseIcon> = {
  work: BriefcaseIcon,
  education: GraduationCapIcon,
  freelance: WrenchIcon,
  milestone: AwardIcon,
}

// 経歴を縦のタイムラインで並べる
export function CareerTimeline({ entries = careerData }: { entries?: CareerEntry[] }) {
  return (
    <ol className="relative ml-4 border-l border-border">
      {entries.map((entry) => (
        <CareerTimelineItem key={entry.title} entry={entry} />
      ))}
    </ol>
  )
}

function CareerTimelineItem({ entry }: { entry: CareerEntry }) {
  const Icon = icons[entry.type]

  return (
    <li className="relative pb-10 pl-8 last:pb-0">
      <span className="absolute -left-4 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-card">
        <Icon className="h-4 w-4" />
      </span>

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <time>
          {entry.startDate} - {entry.endDate ?? "現在"}
        </time>
        {entry.ongoing && <Badge variant="status">継続中</Badge>}
      </div>

      <div className="mt-2 rounded-lg border border-border/40 border-t-4 border-t-primary bg-card p-4 shadow-md">
        <h3 className="text-lg font-semibold">{entry.title}</h3>
        <p className="text-sm text-muted-foreground">{entry.subtitle}</p>
        {entry.description && <p className="mt-2">{entry.description}</p>}

        {entry.engagements && entry.engagements.length > 0 && (
          <>
            <TagList tags={entry.engagements.map((e) => e.client)} variant="secondary" label="参画先" className="mt-3 gap-2" />
            <EngagementsDialog title={entry.title} engagements={entry.engagements} />
          </>
        )}
      </div>
    </li>
  )
}
