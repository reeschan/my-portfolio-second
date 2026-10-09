"use client"

import { ReactNode, useMemo } from "react"
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent } from "@/components/ui/card"
import { useIsClient } from "@/hooks/use-is-client"
import { useMediaQuery } from "@/hooks/use-media-query"
import { chartColors } from "@/lib/theme"

// スキルデータの型定義をエクスポート
export type SkillData = {
  name?: string
  subject?: string
  shortName?: string // モバイル用の短縮名
  shortSubject?: string // モバイル用の短縮名
  level?: number
  value?: number
  fullMark?: number
}

// スキルレーダーコンポーネントの型定義
export type SkillRadarProps = {
  title: string
  data: SkillData[] // レーダーチャートのデータ
  dataKey?: string // レーダーチャートのデータキー（"value" または "level"）
  angleDataKey?: string // 角度軸のデータキー（"subject" または "name"）
  children?: ReactNode // 子要素（資格ハイライトなど）
}

// 極端に小さい画面で使う名前。スラッシュがある短縮名は最初の部分だけ、なければ先頭 2 文字にする
function shortestLabel(item: SkillData) {
  return item.shortName?.split("/")[0] || item.shortName || item.name?.substring(0, 2) || item.subject?.substring(0, 2)
}

// スマホ幅で使う短縮名。角度軸のキーに合わせて shortName か shortSubject を選ぶ
function shortLabel(item: SkillData, angleDataKey: string) {
  return angleDataKey === "name" ? item.shortName || item.name : item.shortSubject || item.subject
}

// スキルレーダーコンポーネント
export function SkillRadar({ title, data, dataKey = "value", angleDataKey = "subject", children }: SkillRadarProps) {
  // モバイル画面かどうかを判定
  const isMobile = useMediaQuery("(max-width: 640px)")
  const isSmallerMobile = useMediaQuery("(max-width: 400px)")
  // recharts はサーバーでは大きさを測れないため、マウント後にだけ描く (それまでは同じ高さの枠を出す)
  const isMounted = useIsClient()

  // データにモバイル用の短縮名がある場合は使用する。デスクトップではそのまま
  const processedData = useMemo(() => {
    return data.map((item) => {
      if (isSmallerMobile) return { ...item, [angleDataKey]: shortestLabel(item) }
      if (isMobile) return { ...item, [angleDataKey]: shortLabel(item, angleDataKey) }
      return item
    })
  }, [data, isMobile, isSmallerMobile, angleDataKey])

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <div className={`${isMobile ? "h-[350px]" : "h-[400px]"} w-full`}>
          {isMounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius={isMobile ? "70%" : "80%"} data={processedData}>
                <PolarGrid stroke={chartColors.grid} />
                <PolarAngleAxis
                  dataKey={angleDataKey}
                  tick={{
                    fill: chartColors.foreground,
                    fontSize: isMobile ? 12 : 14,
                  }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 5]}
                  tickCount={6}
                  stroke={chartColors.grid}
                  tick={{ fontSize: isMobile ? 10 : 12 }}
                />
                <Radar name="スキルレベル" dataKey={dataKey} stroke={chartColors.primary} fill={chartColors.primary} fillOpacity={0.6} />
                <Legend formatter={() => "スキルレベル (5段階評価)"} wrapperStyle={{ fontSize: isMobile ? 12 : 14 }} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full animate-pulse rounded-md bg-muted/20" />
          )}
        </div>
        {children && <div className="mt-8">{children}</div>}
      </CardContent>
    </Card>
  )
}
