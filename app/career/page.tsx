import { PageTemplate } from "@/components/layout/page-template"
import { CareerTimeline } from "@/components/features/career/career-timeline"

export default function CareerPage() {
  return (
    <PageTemplate title="経歴">
      <CareerTimeline />
    </PageTemplate>
  )
}
