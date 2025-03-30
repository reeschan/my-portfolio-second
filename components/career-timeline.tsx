"use client"

import { VerticalTimeline, VerticalTimelineElement } from "react-vertical-timeline-component"
import "react-vertical-timeline-component/style.min.css"
import { BriefcaseIcon, GraduationCapIcon, AwardIcon, WrenchIcon } from "lucide-react"

export function CareerTimeline() {
  return (
    <div className="career-timeline">
      <VerticalTimeline lineColor="hsl(var(--border))">
         {/* フリーランス */}
      <VerticalTimelineElement
          className="vertical-timeline-element--work"
          contentStyle={{
            background: "hsl(var(--primary)/15)",
            color: "hsl(var(--foreground))",
            borderTop: "4px solid hsl(var(--primary))",
          }}
          contentArrowStyle={{ borderRight: "7px solid hsl(var(--primary)/15)" }}
          date="2025年03月 - "
          dateClassName="text-muted-foreground dark:text-muted-foreground"
          iconStyle={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
          icon={<BriefcaseIcon className="h-5 w-5" />}
        >
          <h3 className="vertical-timeline-element-title text-lg font-semibold">フリーランス転向</h3>
          <h4 className="vertical-timeline-element-subtitle text-muted-foreground">Free</h4>
          <p className="mt-2">
          </p>
        </VerticalTimelineElement>       
        
        {/* 東京海上日動システムズ株式会社 */}
        <VerticalTimelineElement
          className="vertical-timeline-element--work"
          contentStyle={{
            background: "hsl(var(--primary)/15)",
            color: "hsl(var(--foreground))",
            borderTop: "4px solid hsl(var(--primary))",
          }}
          contentArrowStyle={{ borderRight: "7px solid hsl(var(--primary)/15)" }}
          date="2022年04月 - 2024年12月"
          dateClassName="text-muted-foreground dark:text-muted-foreground"
          iconStyle={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
          icon={<BriefcaseIcon className="h-5 w-5" />}
        >
          <h3 className="vertical-timeline-element-title text-lg font-semibold">東京海上日動システムズ株式会社</h3>
          <h4 className="vertical-timeline-element-subtitle text-muted-foreground">正社員</h4>
          <p className="mt-2">
            デジタルイノベーション開発部にて、アジャイル・スクラム開発をメインとした東京海上グループのシステム内製開発に従事
          </p>
        </VerticalTimelineElement>

        {/* 株式会社網屋 */}
        <VerticalTimelineElement
          className="vertical-timeline-element--work"
          contentStyle={{
            background: "hsl(var(--card))",
            color: "hsl(var(--foreground))",
            borderTop: "4px solid hsl(var(--primary))",
          }}
          contentArrowStyle={{ borderRight: "7px solid hsl(var(--card))" }}
          date="2018年08月 - 2022年03月"
          dateClassName="text-muted-foreground dark:text-muted-foreground"
          iconStyle={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
          icon={<BriefcaseIcon className="h-5 w-5" />}
        >
          <h3 className="vertical-timeline-element-title text-lg font-semibold">株式会社網屋</h3>
          <h4 className="vertical-timeline-element-subtitle text-muted-foreground">正社員</h4>
          <p className="mt-2">
            自社セキュリティパッケージ製品 ALog Converter
            の開発に従事し、フロントエンド開発をメインとして機能要望に沿って開発
          </p>
        </VerticalTimelineElement>

        {/* 今後 */}
        <VerticalTimelineElement
          iconStyle={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
          icon={<GraduationCapIcon className="h-5 w-5" />}
        />
      </VerticalTimeline>
    </div>
  )
}

