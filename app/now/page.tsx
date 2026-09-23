import type { Metadata } from "next"
import { PageTemplate } from "@/components/page-template"
import { now } from "@/data/now"

export const metadata: Metadata = {
  title: "Now | Ryuki Tobita's Portfolio",
  description: "いま取り組んでいること",
}

// "YYYY-MM-DD" を「YYYY年M月D日」に整形する (タイムゾーンの影響を受けないよう文字列から組み立てる)
function formatDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number)
  return `${year}年${month}月${day}日`
}

export default function NowPage() {
  return (
    <PageTemplate title="Now">
      <div className="max-w-2xl space-y-8">
        <p className="text-muted-foreground">
          いま取り組んでいることをまとめたページです。
          <time dateTime={now.lastUpdated}>{formatDate(now.lastUpdated)}</time>時点
          {now.location && <>・{now.location}</>}
        </p>

        {now.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="mb-3 text-xl font-semibold">{section.heading}</h2>
            <ul className="list-disc space-y-1.5 pl-5">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}

        {now.availability && (
          <p className="border-l-4 border-primary pl-4">{now.availability}</p>
        )}

        <p className="text-sm text-muted-foreground">
          このページは{" "}
          <a
            href="https://nownownow.com/about"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            nownownow.com/about
          </a>{" "}
          の考え方にならっています。
        </p>
      </div>
    </PageTemplate>
  )
}
