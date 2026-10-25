import { Suspense, type ReactNode } from "react"
import { defaultLocale, type Locale } from "@/lib/i18n/config"
import { LocaleProvider } from "@/lib/i18n/locale-context"
import { getLocale } from "@/lib/i18n/server"

// 既定の言語で描いた木を <Suspense> の fallback にする (ADR 0038)。
// fallback は静的な殻にそのまま入る。JS を動かさないクローラーは、後から届く <div hidden id="S:"> を読まないので、
// 本文を fallback に置いて殻に残す。Cookie の言語は中で読み、届いたら同じ木を描き直して差し替える。
// 描く木は関数にする。同じ RSC のスロットを fallback と中の両方に置くと、片方にしか出ないため
export function Localized({ children }: { children: (locale: Locale) => ReactNode }) {
  return (
    <Suspense fallback={<LocaleProvider locale={defaultLocale}>{children(defaultLocale)}</LocaleProvider>}>
      <LocalizedContent>{children}</LocalizedContent>
    </Suspense>
  )
}

// Cookie から表示言語を読む部分。ここだけがリクエストごとに走る
async function LocalizedContent({ children }: { children: (locale: Locale) => ReactNode }) {
  const locale = await getLocale()
  return <LocaleProvider locale={locale}>{children(locale)}</LocaleProvider>
}
