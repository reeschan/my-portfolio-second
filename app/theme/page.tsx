import type { Metadata } from "next"
import { Section } from "@/components/common"
import { PageTemplate } from "@/components/layout/page-template"
import { ThemePicker } from "@/components/features/theme/theme-picker"

export const metadata: Metadata = {
  title: "テーマ | Ryuki Tobita's Portfolio",
  description: "背景の 3D シーンを選べます",
}

export default function ThemePage() {
  return (
    <PageTemplate title="テーマ">
      <Section title="背景を選ぶ">
        <p className="mb-6 text-muted-foreground">
          サイト全体の背景に流れる 3D シーンを切り替えられます。選んだテーマはこのブラウザに保存され、次に開いたときも同じ背景で表示されます。
        </p>
        <ThemePicker />
      </Section>
    </PageTemplate>
  )
}
