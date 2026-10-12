import { AwardIcon, BriefcaseIcon, GraduationCapIcon, WrenchIcon } from "lucide-react"
import { Timeline, TimelineCard, TimelineItem, TimelineMarker, TimelineMeta } from "tokiline/react"
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

// 経歴を縦のタイムラインで並べる。線・マーカー・カードの配置は tokiline に任せ、色は globals.css の変数で合わせる (ADR 0023)
export function CareerTimeline({ entries = careerData }: { entries?: CareerEntry[] }) {
  return (
    <Timeline side="end">
      {entries.map((entry) => (
        <CareerTimelineItem key={entry.title} entry={entry} />
      ))}
    </Timeline>
  )
}

function CareerTimelineItem({ entry }: { entry: CareerEntry }) {
  const Icon = icons[entry.type]

  return (
    <TimelineItem>
      <TimelineMarker>
        <Icon className="h-4 w-4" />
      </TimelineMarker>

      <TimelineMeta className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <time>
          {entry.startDate} - {entry.endDate ?? "現在"}
        </time>
        {entry.ongoing && <Badge variant="status">継続中</Badge>}
      </TimelineMeta>

      {/* カードの面は今までと同じ見た目を保つため、Tailwind のクラスで指定する */}
      <TimelineCard className="rounded-lg border border-border/40 border-t-4 border-t-primary bg-card p-4 shadow-md">
        <h3 className="text-lg font-semibold">{entry.title}</h3>
        <p className="text-sm text-muted-foreground">{entry.subtitle}</p>
        {entry.description && <p className="mt-2">{entry.description}</p>}

        {entry.engagements && entry.engagements.length > 0 && (
          <>
            <TagList tags={entry.engagements.map((e) => e.client)} variant="secondary" label="参画先" className="mt-3 gap-2" />
            <EngagementsDialog title={entry.title} engagements={entry.engagements} />
          </>
        )}
      </TimelineCard>
    </TimelineItem>
  )
}
