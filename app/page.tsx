import Link from "next/link"
import { LocaleSwitch } from "@/components/layout/locale-switch"

// サーバーコンポーネントで描き、見出しと「Enter」のリンクを最初の HTML に含める。
// JS を待たずに中身が出るので、最大の描画 (LCP) が早まり、クローラーやリンクのプレビューにも見出しが見える。
// 登場の演出は CSS のアニメーション (app/globals.css の --animate-rise / --animate-fade-in) だけで付ける。
// JS で演出すると、JS が動くまで本文が透明のまま残るため。視差効果を減らす設定では motion-safe: で演出しない。
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      {/* タブのないトップでも、各ページと同じく右上で言語を選べるようにする */}
      <LocaleSwitch className="absolute right-4 top-4" />
      <div className="text-center motion-safe:animate-rise">
        {/* 全体より 0.2 秒遅れて浮かび上がらせ、見出しに目が行くようにする */}
        <h1 className="mb-12 text-5xl font-bold tracking-tight md:text-6xl lg:text-7xl motion-safe:animate-rise motion-safe:[animation-delay:200ms]">
          <span className="bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">Ryuki Tobita</span>
          <span className="block mt-2">Portfolio</span>
        </h1>

        {/* 見出しが出そろってから入口を出す */}
        <div className="motion-safe:animate-fade-in motion-safe:[animation-delay:600ms]">
          <Link
            href="/overview"
            className="group relative inline-block text-2xl font-medium text-primary transition-colors hover:text-primary/90"
          >
            Enter
            <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-primary transition-all duration-300 group-hover:w-full"></span>
          </Link>
        </div>
      </div>
    </main>
  )
}
