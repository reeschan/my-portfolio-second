import { Badge, type BadgeProps } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type TagListProps = {
  tags: readonly string[]
  variant?: BadgeProps["variant"]
  className?: string
  // スクリーンリーダー向けに、何の一覧かを伝える (例: 「使用技術」)
  label?: string
}

// バッジを横に並べた一覧
export function TagList({ tags, variant, className, label }: TagListProps) {
  if (tags.length === 0) return null
  return (
    <ul aria-label={label} className={cn("flex flex-wrap gap-1.5", className)}>
      {tags.map((tag) => (
        <li key={tag}>
          <Badge variant={variant}>{tag}</Badge>
        </li>
      ))}
    </ul>
  )
}
