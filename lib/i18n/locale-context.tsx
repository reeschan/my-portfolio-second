"use client"

import { createContext, useContext, type ReactNode } from "react"
import { messagesOf, type Messages } from "@/data/messages"
import { defaultLocale, type Locale } from "./config"

// Client Component に今の表示言語を配る。値はルートのレイアウトが Cookie から読んで渡す
const LocaleContext = createContext<Locale>(defaultLocale)

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext value={locale}>{children}</LocaleContext>
}

export function useLocale(): Locale {
  return useContext(LocaleContext)
}

export function useMessages(): Messages {
  return messagesOf(useLocale())
}
