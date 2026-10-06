import type { Metadata } from "next"
import { BulletList, Callout, Section, TextLink } from "@/components/common"
import { PageTemplate } from "@/components/layout/page-template"
import { now } from "@/data/now"
import { formatJapaneseDate } from "@/lib/format"

export const metadata: Metadata = {
  title: "Now | Ryuki Tobita's Portfolio",
  description: "いま取り組んでいること",
}

export default function NowPage() {
  return (
    <PageTemplate title="Now">
      <div className="max-w-2xl space-y-8">
        <p className="text-muted-foreground">
          いま取り組んでいることをまとめたページです。
          <time dateTime={now.lastUpdated}>{formatJapaneseDate(now.lastUpdated)}</time>時点
          {now.location && <>・{now.location}</>}
        </p>

        {now.sections.map((section) => (
          <Section key={section.heading} title={section.heading}>
            <BulletList items={section.items} />
          </Section>
        ))}

        {now.availability && (
          <Callout variant="emphasis">
            <p>{now.availability}</p>
          </Callout>
        )}

        <p className="text-sm text-muted-foreground">
          このページは <TextLink href="https://nownownow.com/about">nownownow.com/about</TextLink> の考え方にならっています。
        </p>
      </div>
    </PageTemplate>
  )
}
