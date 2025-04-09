"use client"

import { PageTemplate } from "@/components/page-template"
import Image from "next/image"
import { SkillRadar } from "@/components/skill-radar"
import { Card, CardContent } from "@/components/ui/card"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useState } from "react"

export default function WorksPage() {
  const [showDetails, setShowDetails] = useState(false)
  
  return (
    <PageTemplate title="ワーク">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-border/50 bg-background/50 transition-all hover:shadow-md">
          <div className="relative h-48 w-full">
            <Image src="/placeholder.svg?height=400&width=600" alt="ポートフォリオサイト" fill className="object-cover" />
          </div>
          <div className="p-4">
            <h3 className="text-lg font-medium">ポートフォリオサイト</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Next.jsとReactを使用して構築された個人ポートフォリオサイト。
              スキルをレーダーチャートで表示、経歴をタイムラインで表示など、
              データ駆動の視覚化を重視したデザイン。
            </p>
            <button 
              onClick={() => setShowDetails(!showDetails)}
              className="mt-3 px-3 py-1 text-xs rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              {showDetails ? "詳細を隠す" : "詳細を表示"}
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-border/50 bg-background/50 transition-all hover:shadow-md">
          <div className="relative h-48 w-full">
            <Image src="/placeholder.svg?height=400&width=600" alt="プロジェクト2" fill className="object-cover" />
          </div>
          <div className="p-4">
            <h3 className="text-lg font-medium">プロジェクト2</h3>
            <p className="mt-2 text-sm text-muted-foreground">プロジェクト2の説明文をここに記載します。</p>
          </div>
        </div>
      </div>
      
      {/* ポートフォリオの詳細情報 */}
      {showDetails && (
        <div className="mt-8 space-y-8">
          <TechnologyStack />
          <ArchitectureDiagram />
        </div>
      )}
    </PageTemplate>
  )
}

function TechnologyStack() {
  const techStackData = [
    { subject: "Next.js", shortSubject: "Next", value: 5, fullMark: 5 },
    { subject: "React", shortSubject: "React", value: 5, fullMark: 5 },
    { subject: "TypeScript", shortSubject: "TS", value: 5, fullMark: 5 },
    { subject: "TailwindCSS", shortSubject: "TW", value: 5, fullMark: 5 },
    { subject: "Framer Motion", shortSubject: "FM", value: 4, fullMark: 5 },
    { subject: "Recharts", shortSubject: "RC", value: 4, fullMark: 5 },
  ]
  
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">使用技術</h2>
      <SkillRadar
        title="技術スタック"
        data={techStackData}
      >
        <div className="p-4 bg-primary/5 rounded-lg mt-4">
          <h3 className="text-xl font-semibold mb-2">主要技術</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Next.js:</strong> Reactフレームワーク、ページルーティングとSSRを提供</li>
            <li><strong>React 19:</strong> UIコンポーネントの構築</li>
            <li><strong>TypeScript:</strong> 型安全なJavaScript</li>
            <li><strong>TailwindCSS:</strong> ユーティリティファーストのCSSフレームワーク</li>
            <li><strong>Framer Motion:</strong> アニメーション</li>
            <li><strong>Recharts:</strong> データの視覚化</li>
          </ul>
        </div>
      </SkillRadar>
    </div>
  )
}

function ArchitectureDiagram() {
  const isMobile = useMediaQuery("(max-width: 640px)")

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">アーキテクチャ</h2>
      <Card>
        <CardContent className="pt-6">
          <div className="relative" style={{ height: isMobile ? "300px" : "400px" }}>
            {/* アーキテクチャ図のプレースホルダー */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
              <h3 className="text-xl font-medium mb-4">アーキテクチャ構成</h3>
              
              <div className="w-full max-w-2xl mx-auto grid grid-cols-3 gap-4 text-sm">
                {/* 1行目: ユーザーインターフェース */}
                <div className="col-span-3 p-2 bg-primary/10 rounded-md border border-primary/20">
                  <strong>UI レイヤー</strong>
                  <p>コンポーネント (Tailwind, Framer Motion)</p>
                </div>
                
                {/* 2行目: データと状態管理 */}
                <div className="col-span-3 p-2 bg-blue-500/10 rounded-md border border-blue-500/20">
                  <strong>データレイヤー</strong>
                  <p>React Hooks, Context API</p>
                </div>
                
                {/* 3行目: 視覚化 */}
                <div className="col-span-3 p-2 bg-green-500/10 rounded-md border border-green-500/20">
                  <strong>視覚化レイヤー</strong>
                  <p>Recharts, React Vertical Timeline</p>
                </div>
                
                {/* 4行目: インフラ */}
                <div className="col-span-3 p-2 bg-purple-500/10 rounded-md border border-purple-500/20">
                  <strong>インフラ</strong>
                  <p>Next.js, Vercel</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

