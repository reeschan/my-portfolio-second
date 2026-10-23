import Link from "next/link"
import { Intro } from "@/components/features/intro/intro"
import { LocaleSwitch } from "@/components/layout/locale-switch"

// このページはサーバーコンポーネントのままにする。見出しと入口を Intro に渡すと、Intro がサーバー側で
// 描いた結果を最初の HTML に含めるので、JS を待たずに見出しとリンクが出る (docs/specs/intro-handoff.md)。
// 導入演出の流れと引き継ぎは Intro (クライアントの部品) が持ち、このページは見た目の材料だけを渡す。
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      {/* タブのないトップでも、各ページと同じく右上で言語を選べるようにする */}
      <LocaleSwitch className="absolute right-4 top-4" />
      <Intro
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
    </main>
  )
}
