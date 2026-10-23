"use client"

import { useLayoutEffect } from "react"
import type { Locale } from "@/lib/i18n/config"

// 言語を切り替えたあと (Server Function で Cookie を書いて描き直したとき) と、開発中の Strict Mode で
// React が <html> の属性を JSX の値に戻したときに、<html lang> を合わせ直す (PBI-009)。
// 描画の前に属性を書くが state は持たないので、「useEffect の中で setState しない」決まりには当たらない
export function HtmlLang({ locale }: { locale: Locale }) {
  useLayoutEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return null
}
