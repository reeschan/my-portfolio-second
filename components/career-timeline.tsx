import {
  BriefcaseIcon,
  GraduationCapIcon,
  AwardIcon,
  WrenchIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Career entry type definition
type CareerEntryType = "work" | "education" | "freelance" | "milestone";

// 参画案件
interface Engagement {
  client: string;
  period?: string;
  summary: string;
  points: string[];
  tech?: string[];
}

interface CareerEntry {
  type: CareerEntryType;
  title: string;
  subtitle: string;
  description?: string;
  startDate: string;
  endDate?: string;
  ongoing?: boolean;
  engagements?: Engagement[];
}

// Career data (新しい順)
const careerData: CareerEntry[] = [
  {
    type: "freelance",
    title: "フリーランス",
    subtitle: "個人事業主",
    description:
      "Web アプリケーション開発を中心に、フロントエンドからクラウド基盤、検索・AI 連携まで一貫して担当。",
    startDate: "2025年03月",
    ongoing: true,
    engagements: [
      {
        client: "Forgers",
        // TODO: 参画期間 (period) と使用技術 (tech) を記入する
        summary: "VR・3D モデルを扱うプロジェクトでの Web アプリケーション開発。",
        // TODO: 担当内容 (points) を記入する
        points: [],
      },
      {
        client: "Stract",
        // TODO: 参画期間 (period) と使用技術 (tech) を記入する
        summary: "Plug アプリの開発。",
        points: [
          "検索機能の改善",
          "AI 連携機能の開発",
          "UI 刷新プロジェクトへの参画",
        ],
      },
    ],
  },
  {
    type: "work",
    title: "東京海上日動システムズ株式会社",
    subtitle: "正社員",
    description:
      "デジタルイノベーション開発部にて、アジャイル・スクラム開発をメインとした東京海上グループのシステム内製開発に従事",
    startDate: "2022年04月",
    endDate: "2024年12月",
  },
  {
    type: "work",
    title: "株式会社網屋",
    subtitle: "正社員",
    description:
      "自社セキュリティパッケージ製品 ALog Converter の開発に従事し、 フロントエンド開発をメインとして機能要望に沿って開発",
    startDate: "2018年08月",
    endDate: "2022年03月",
  },
];

// Function to get the appropriate icon based on entry type
function getIconForType(type: CareerEntryType) {
  switch (type) {
    case "work":
      return <BriefcaseIcon className="h-4 w-4" />;
    case "education":
      return <GraduationCapIcon className="h-4 w-4" />;
    case "freelance":
      return <WrenchIcon className="h-4 w-4" />;
    case "milestone":
      return <AwardIcon className="h-4 w-4" />;
    default:
      return <BriefcaseIcon className="h-4 w-4" />;
  }
}

function EngagementsDialog({
  title,
  engagements,
}: {
  title: string;
  engagements: Engagement[];
}) {
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
                {engagement.period && (
                  <span className="text-xs text-muted-foreground">
                    {engagement.period}
                  </span>
                )}
              </div>
              <p className="text-sm">{engagement.summary}</p>
              {engagement.points.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {engagement.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              )}
              {engagement.tech && engagement.tech.length > 0 && (
                <ul className="flex flex-wrap gap-1.5 pt-1">
                  {engagement.tech.map((tech) => (
                    <li
                      key={tech}
                      className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {tech}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CareerTimeline() {
  return (
    <ol className="relative ml-4 border-l border-border">
      {careerData.map((entry) => (
        <li key={entry.title} className="relative pb-10 pl-8 last:pb-0">
          <span className="absolute -left-4 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-card">
            {getIconForType(entry.type)}
          </span>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <time>
              {entry.startDate} - {entry.endDate ?? "現在"}
            </time>
            {entry.ongoing && (
              <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                継続中
              </span>
            )}
          </div>

          <div className="mt-2 rounded-lg border border-border/40 border-t-4 border-t-primary bg-card p-4 shadow-md">
            <h3 className="text-lg font-semibold">{entry.title}</h3>
            <p className="text-sm text-muted-foreground">{entry.subtitle}</p>
            {entry.description && <p className="mt-2">{entry.description}</p>}

            {entry.engagements && entry.engagements.length > 0 && (
              <>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {entry.engagements.map((engagement) => (
                    <li
                      key={engagement.client}
                      className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                    >
                      {engagement.client}
                    </li>
                  ))}
                </ul>
                <EngagementsDialog
                  title={entry.title}
                  engagements={entry.engagements}
                />
              </>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
