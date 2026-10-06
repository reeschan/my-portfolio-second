import { cn } from "@/lib/utils"

type BulletListProps = {
  items: readonly string[]
  className?: string
}

// 黒丸付きの箇条書き。文言が重複しない前提で文言をキーにする
export function BulletList({ items, className }: BulletListProps) {
  return (
    <ul className={cn("list-disc space-y-1.5 pl-5", className)}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}
