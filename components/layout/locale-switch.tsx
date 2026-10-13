"use client"

import { useTransition } from "react"
import { cn } from "@/lib/utils"
import { setLocale } from "@/lib/i18n/actions"
import { locales, type Locale } from "@/lib/i18n/config"
import { useLocale, useMessages } from "@/lib/i18n/locale-context"

// スイッチに出す短い名前。どちらの言語で見ていても同じ表記にし、自分の読める言語を見つけやすくする
const localeLabels: Record<Locale, string> = { ja: "JP", en: "EN" }

// 右上の言語スイッチ。選んだ言語は Server Function で Cookie に残し、ページを描き直す
export function LocaleSwitch({ className }: { className?: string }) {
  const current = useLocale()
  const messages = useMessages()
  const [isPending, startTransition] = useTransition()

  return (
    <div
      role="group"
      aria-label={messages.layout.language}
      className={cn("flex h-7 shrink-0 items-center rounded-full bg-background/60 p-0.5 text-xs font-medium", className)}
    >
      {locales.map((locale) => {
        const isActive = locale === current
        return (
          <button
            key={locale}
            type="button"
            lang={locale}
            aria-pressed={isActive}
            disabled={isPending}
            onClick={() => {
              if (isActive) return
              startTransition(async () => {
                await setLocale(locale)
              })
            }}
            className={cn(
              "h-6 rounded-full px-2.5 transition-colors disabled:cursor-wait",
              isActive ? "bg-primary/15 font-semibold text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {localeLabels[locale]}
          </button>
        )
      })}
    </div>
  )
}
