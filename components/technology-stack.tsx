"use client"

import { SkillRadar } from "@/components/skill-radar"

export function TechnologyStack() {
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
