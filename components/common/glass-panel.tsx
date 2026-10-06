import type React from "react"
import { cn } from "@/lib/utils"

type GlassPanelProps = React.HTMLAttributes<HTMLDivElement> & {
  // 余白の大きさ。ページ本文は lg、パネルの中の小さな面は md
  padding?: "md" | "lg"
}

// 3D 背景の上に浮かぶガラス調の面 (app/globals.css の glass-panel)。ページ本文の枠に使う
export function GlassPanel({ padding = "lg", className, ...props }: GlassPanelProps) {
  return <div className={cn("glass-panel rounded-lg", padding === "lg" ? "p-6" : "p-4", className)} {...props} />
}
