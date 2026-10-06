import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// 小さなラベル。状態 (継続中) や分類 (参画先・使用技術) を示す。
// 見た目の種類はここに閉じ込め、画面側では variant だけを選ぶ
const badgeVariants = cva("inline-flex items-center text-xs font-medium", {
  variants: {
    variant: {
      // 状態を強調する (例: 継続中)
      status: "rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-primary",
      // 一覧の見出し的なラベル (例: 参画先の名前)
      secondary: "rounded-full bg-secondary px-2.5 py-0.5 text-secondary-foreground",
      // 補足情報 (例: 使用技術)
      muted: "rounded-md bg-muted px-2 py-0.5 font-normal text-muted-foreground",
    },
  },
  defaultVariants: {
    variant: "secondary",
  },
})

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
