import type { Locale } from "@/lib/i18n/config"
import { en } from "./en"
import { ja, type Messages } from "./ja"

export type { Messages }

const messages: Record<Locale, Messages> = { ja, en }

export function messagesOf(locale: Locale): Messages {
  return messages[locale]
}
