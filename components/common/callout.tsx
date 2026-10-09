import type React from "react"
import { cn } from "@/lib/utils"

type CalloutProps = {
  // emphasis: 左に線を引いて目立たせる一文 (例: 仕事の受付状況)
  // tinted:   薄く色を敷いたまとまり (例: 資格ハイライト)
  variant?: "emphasis" | "tinted"
  title?: React.ReactNode
  className?: string
  children: React.ReactNode
}

// 本文から一段目立たせたい情報の囲み
export function Callout({ variant = "tinted", title, className, children }: CalloutProps) {
  return (
    <div className={cn(variant === "emphasis" ? "border-l-4 border-primary pl-4" : "rounded-lg bg-primary/5 p-4", className)}>
      {title && <h2 className="mb-2 text-xl font-semibold">{title}</h2>}
      {children}
    </div>
  )
}
