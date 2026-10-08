"use client"

import { useSyncExternalStore } from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  backgroundThemes,
  getBackgroundThemeId,
  getServerBackgroundThemeId,
  isBackgroundThemeId,
  setBackgroundThemeId,
  subscribeBackgroundTheme,
} from "@/lib/background-theme"

// 3D 背景のテーマを選ぶラジオボタンの一覧。選んだ瞬間に全ページの背景が切り替わる
export function ThemePicker() {
  const selected = useSyncExternalStore(subscribeBackgroundTheme, getBackgroundThemeId, getServerBackgroundThemeId)

  return (
    <fieldset>
      <legend className="sr-only">背景のテーマ</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        {backgroundThemes.map((theme) => {
          const isSelected = theme.id === selected
          return (
            <label
              key={theme.id}
              className={cn(
                "group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border transition-colors",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                isSelected ? "border-primary bg-primary/10" : "border-border/40 bg-background/30 hover:border-primary/50",
              )}
            >
              <input
                type="radio"
                name="background-theme"
                value={theme.id}
                checked={isSelected}
                onChange={(e) => {
                  if (isBackgroundThemeId(e.target.value)) setBackgroundThemeId(e.target.value)
                }}
                aria-describedby={`theme-${theme.id}-description`}
                className="sr-only"
              />
              {/* three.js の描画を待たずに雰囲気が分かるよう、テーマの代表色で見本を塗る (色は lib/background-theme.ts) */}
              <span
                aria-hidden
                className="block h-20 w-full"
                style={{
                  background: `radial-gradient(circle at 75% 30%, ${theme.swatch[2]} 0%, transparent 35%), linear-gradient(180deg, ${theme.swatch[0]} 0%, ${theme.swatch[1]} 100%)`,
                }}
              />
              <span className="flex items-start justify-between gap-2 p-4">
                <span>
                  <span className="block font-semibold">{theme.label}</span>
                  <span id={`theme-${theme.id}-description`} className="mt-1 block text-sm text-muted-foreground">
                    {theme.description}
                  </span>
                </span>
                {isSelected && <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
