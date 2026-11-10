import { AwardIcon, BriefcaseIcon, GraduationCapIcon, WrenchIcon } from "lucide-react"
import { Timeline, TimelineCard, TimelineItem, TimelineMarker, TimelineMeta } from "tokiline/react"
import { TagList } from "@/components/common"
import { Badge } from "@/components/ui/badge"
import type { CareerEntry, CareerEntryType } from "@/data/career"
import type { Messages } from "@/data/messages"
import { EngagementsDialog } from "./engagements-dialog"

const icons: Record<CareerEntryType, typeof BriefcaseIcon> = {
  work: BriefcaseIcon,
  education: GraduationCapIcon,
  freelance: WrenchIcon,
  milestone: AwardIcon,
}

type CareerTimelineProps = {
  entries: CareerEntry[]
  // 表示言語の文言。ページ (Server Component) が Cookie から決めて渡す
  messages: Messages["career"]
}

// 経歴を縦のタイムラインで並べる。線・マーカー・カードの配置は tokiline に任せ、色は globals.css の変数で合わせる (ADR 0023)
export function CareerTimeline({ entries, messages }: CareerTimelineProps) {
  return (
    <Timeline side="end">
      {entries.map((entry) => (
        <CareerTimelineItem key={entry.title} entry={entry} messages={messages} />
      ))}
    </Timeline>
  )
}

function CareerTimelineItem({ entry, messages }: { entry: CareerEntry; messages: Messages["career"] }) {
  const Icon = icons[entry.type]

  return (
    <TimelineItem>
      <TimelineMarker>
        <Icon className="h-4 w-4" />
      </TimelineMarker>

      <TimelineMeta className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <time className="font-mono tabular-nums">
          {entry.startDate} - {entry.endDate ?? messages.present}
        </time>
        {entry.ongoing && <Badge variant="status">{messages.ongoing}</Badge>}
      </TimelineMeta>

      {/* カードの面をこのサイトのトークンで揃えるため、Tailwind のクラスで指定する。強調は細い線と面の段差だけで付け、青や影は使わない */}
      <TimelineCard className="rounded-lg border border-border/40 bg-card p-4">
        {/* ページの h1 の下に h2 を挟まず h3 を置くと段が飛ぶので、経歴の項目は h2 にする。見た目はクラスで保つ */}
        <h2 className="text-lg font-semibold">{entry.title}</h2>
        <p className="text-sm text-muted-foreground">{entry.subtitle}</p>
        {entry.description && <p className="mt-2">{entry.description}</p>}

        {entry.engagements && entry.engagements.length > 0 && (
          <>
            <TagList tags={entry.engagements.map((e) => e.client)} variant="secondary" label={messages.clients} className="mt-3 gap-2" />
            <EngagementsDialog title={entry.title} engagements={entry.engagements} messages={messages} />
          </>
        )}
      </TimelineCard>
    </TimelineItem>
  )
}
