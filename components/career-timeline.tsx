"use client";

import {
  VerticalTimeline,
  VerticalTimelineElement,
} from "react-vertical-timeline-component";
import "react-vertical-timeline-component/style.min.css";
import {
  BriefcaseIcon,
  GraduationCapIcon,
  AwardIcon,
  WrenchIcon,
} from "lucide-react";

// Career entry type definition
type CareerEntryType = "work" | "education" | "freelance" | "milestone";

interface CareerEntry {
  type: CareerEntryType;
  title: string;
  subtitle: string;
  description: string;
  startDate: string;
  endDate?: string;
  highlighted?: boolean;
}

// Career data
const careerData: CareerEntry[] = [
  {
    type: "freelance",
    title: "フリーランス転向",
    subtitle: "Free",
    description: "",
    startDate: "2025年03月",
    highlighted: true,
  },
  {
    type: "work",
    title: "東京海上日動システムズ株式会社",
    subtitle: "正社員",
    description:
      "デジタルイノベーション開発部にて、アジャイル・スクラム開発をメインとした東京海上グループのシステム内製開発に従事",
    startDate: "2022年04月",
    endDate: "2024年12月",
    highlighted: true,
  },
  {
    type: "work",
    title: "株式会社網屋",
    subtitle: "正社員",
    description:
      "自社セキュリティパッケージ製品 ALog Converter の開発に従事し、 フロントエンド開発をメインとして機能要望に沿って開発",
    startDate: "2018年08月",
    endDate: "2022年03月",
    highlighted: false,
  },
];

export function CareerTimeline() {
  // Function to get the appropriate icon based on entry type
  const getIconForType = (type: CareerEntryType) => {
    switch (type) {
      case "work":
        return <BriefcaseIcon className="h-5 w-5" />;
      case "education":
        return <GraduationCapIcon className="h-5 w-5" />;
      case "freelance":
        return <WrenchIcon className="h-5 w-5" />;
      case "milestone":
        return <AwardIcon className="h-5 w-5" />;
      default:
        return <BriefcaseIcon className="h-5 w-5" />;
    }
  };

  return (
    <div className="career-timeline">
      <VerticalTimeline lineColor="hsl(var(--border))">
        {careerData.map((entry, index) => (
          <VerticalTimelineElement
            key={index}
            className={`vertical-timeline-element--${entry.type}`}
            contentStyle={{
              background: entry.highlighted
                ? "hsl(var(--primary)/15)"
                : "hsl(var(--card))",
              color: "hsl(var(--foreground))",
              borderTop: "4px solid hsl(var(--primary))",
            }}
            contentArrowStyle={{
              borderRight: `7px solid ${
                entry.highlighted
                  ? "hsl(var(--primary)/15)"
                  : "hsl(var(--card))"
              }`,
            }}
            date={`${entry.startDate}${
              entry.endDate ? ` - ${entry.endDate}` : " - "
            }`}
            dateClassName="text-muted-foreground dark:text-muted-foreground"
            iconStyle={{
              background: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
            }}
            icon={getIconForType(entry.type)}
          >
            <h3 className="vertical-timeline-element-title text-lg font-semibold">
              {entry.title}
            </h3>
            <h4 className="vertical-timeline-element-subtitle text-muted-foreground">
              {entry.subtitle}
            </h4>
            {entry.description && <p className="mt-2">{entry.description}</p>}
          </VerticalTimelineElement>
        ))}

        {/* Final milestone element */}
        <VerticalTimelineElement
          iconStyle={{
            background: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
          }}
          icon={<GraduationCapIcon className="h-5 w-5" />}
        />
      </VerticalTimeline>
    </div>
  );
}
