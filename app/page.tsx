import { Suspense } from "react"
import Link from "next/link"
import { Intro } from "@/components/features/intro/intro"
import { HtmlLang } from "@/components/layout/html-lang"
import { LocaleSwitch } from "@/components/layout/locale-switch"
import { messagesOf } from "@/data/messages"
import { LocaleProvider } from "@/lib/i18n/locale-context"
import { getLocale } from "@/lib/i18n/server"

// 導入演出の領域の名前を持つ要素の id。殻では言語を読めないので、名前は言語の島がこの id で描き、
// 殻にある導入演出の層が aria-labelledby で指す (ADR 0035)
const introLabelId = "intro-region-label"

// このページはサーバーコンポーネントのままにする。見出しと入口を Intro に渡すと、Intro がサーバー側で
// 描いた結果を最初の HTML に含めるので、JS を待たずに見出しとリンクが出る (docs/specs/intro-handoff.md)。
// 見出しと入口は <Suspense> の外 (殻) に置く。JS が動かないと流れてきた中身を差し替えるスクリプトが動かず、
// <Suspense> の中身は隠れたままなので、そこへ入れると JS を切った閲覧者に見えなくなる (ADR 0035)
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <Intro
        labelId={introLabelId}
        heading={
          // 見出しは導入演出のあいだ透明に置かれ、引き継ぎのあとに見える。登場のアニメーションは Intro が受け持つ
          <h1 className="mb-12 text-center text-5xl font-bold tracking-tight md:text-6xl lg:text-7xl">
            <span className="bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">Ryuki Tobita</span>
            <span className="block mt-2">Portfolio</span>
          </h1>
        }
        entrance={
          // 入口は導入演出の最中でも押せる。面の質感・縁の光・ホバーの帯は共通の glass-button が持つ。
          // 文字サイズと余白は、指でも押しやすい大きさにする
          <Link
            href="/overview"
            className="glass-button inline-flex items-center justify-center px-10 py-3 text-2xl font-medium text-primary transition-colors hover:text-primary/90"
          >
            Enter
          </Link>
        }
      />

      {/* 言語に依る部分 (言語のスイッチと、導入演出の領域の名前) だけを島にする。殻は言語を読まない */}
      <Suspense fallback={<HomeLocaleFallback />}>
        <HomeLocale />
      </Suspense>
    </main>
  )
}

// Cookie から言語を読む部分。ここだけを <Suspense> の中に閉じ込めたので、殻はビルド時に作れる (ADR 0035)
async function HomeLocale() {
  const locale = await getLocale()

  return (
    <LocaleProvider locale={locale}>
      {/* 言語を切り替えたときと、開発中の Strict Mode の属性の戻しに合わせて <html lang> を書き直す */}
      <HtmlLang locale={locale} />
      {/* タブのないトップでも、各ページと同じく右上で言語を選べるようにする */}
      <LocaleSwitch className="absolute right-4 top-4" />
      {/* 導入演出の領域の名前。hidden でも aria-labelledby からは読めるので、画面には出さない */}
      <span id={introLabelId} hidden>
        {messagesOf(locale).intro.loading}
      </span>
    </LocaleProvider>
  )
}

// 言語を読む前の殻。言語のスイッチと同じ大きさの空の場所を取り、中身が届いたときに位置が動かないようにする。
// スイッチは名前に言語を使うので、殻では中身を出さない (SiteFrameFallback と同じ考え方)
function HomeLocaleFallback() {
  return <div aria-hidden className="absolute right-4 top-4 h-7 w-[4.5rem] rounded-full bg-background/60" />
}
