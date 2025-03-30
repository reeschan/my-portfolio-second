import { PageTemplate } from "@/components/page-template"
import Image from "next/image"

export default function WorksPage() {
  return (
    <PageTemplate title="ワーク">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-border/50 bg-background/50 transition-all hover:shadow-md">
          <div className="relative h-48 w-full">
            <Image src="/placeholder.svg?height=400&width=600" alt="プロジェクト1" fill className="object-cover" />
          </div>
          <div className="p-4">
            <h3 className="text-lg font-medium">プロジェクト1</h3>
            <p className="mt-2 text-sm text-muted-foreground">プロジェクト1の説明文をここに記載します。</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-border/50 bg-background/50 transition-all hover:shadow-md">
          <div className="relative h-48 w-full">
            <Image src="/placeholder.svg?height=400&width=600" alt="プロジェクト2" fill className="object-cover" />
          </div>
          <div className="p-4">
            <h3 className="text-lg font-medium">プロジェクト2</h3>
            <p className="mt-2 text-sm text-muted-foreground">プロジェクト2の説明文をここに記載します。</p>
          </div>
        </div>
      </div>
    </PageTemplate>
  )
}

