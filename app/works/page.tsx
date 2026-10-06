import type { Metadata } from "next"
import { PageTemplate } from "@/components/layout/page-template"
import { WorkGallery } from "@/components/features/works/work-gallery"

export const metadata: Metadata = {
  title: "ワーク | Ryuki Tobita's Portfolio",
  description: "制作したもの",
}

export default function WorksPage() {
  return (
    <PageTemplate title="ワーク">
      <WorkGallery />
    </PageTemplate>
  )
}
