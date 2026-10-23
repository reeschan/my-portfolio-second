import { Suspense } from "react"
import Link from "next/link"
import { Intro } from "@/components/features/intro/intro"
import { HtmlLang } from "@/components/layout/html-lang"
import { LocaleSwitch } from "@/components/layout/locale-switch"
import { messagesOf } from "@/data/messages"
import { LocaleProvider } from "@/lib/i18n/locale-context"
import { getLocale } from "@/lib/i18n/server"

// 導入演出の領域の名前 (読み込み中・読み込み完了) を持つ要素の id。殻では言語を読めないので、名前は言語の島が
// この id で描き、殻にある導入演出の層が状態に合わせて aria-labelledby で指す (ADR 0035)
const introLoadingLabelId = "intro-region-loading"
const introCompleteLabelId = "intro-region-complete"

// このページはサーバーコンポーネントのままにする。見出し (導入演出の最後のコマの名前) と入口は、Intro が
// サーバー側で描いた結果として最初の HTML に入るので、JS を待たずに見出しとリンクが出る (docs/specs/intro-complete.md)。
// 見出しと入口は <Suspense> の外 (殻) に置く。JS が動かないと流れてきた中身を差し替えるスクリプトが動かず、
// <Suspense> の中身は隠れたままなので、そこへ入れると JS を切った閲覧者に見えなくなる (ADR 0035)
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <Intro
        loadingLabelId={introLoadingLabelId}
        completeLabelId={introCompleteLabelId}
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
      <span id={introLoadingLabelId} hidden>
        {messagesOf(locale).intro.loading}
      </span>
      <span id={introCompleteLabelId} hidden>
        {messagesOf(locale).intro.complete}
      </span>
    </LocaleProvider>
  )
}

// 言語を読む前の殻。言語のスイッチと同じ大きさの空の場所を取り、中身が届いたときに位置が動かないようにする。
// スイッチは名前に言語を使うので、殻では中身を出さない (SiteFrameFallback と同じ考え方)
function HomeLocaleFallback() {
  return <div aria-hidden className="absolute right-4 top-4 h-7 w-[4.5rem] rounded-full bg-background/60" />
}
