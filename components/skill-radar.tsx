"use client";

import { ReactNode, useMemo } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { useMediaQuery } from "@/hooks/use-media-query";

// スキルデータの型定義をエクスポート
export type SkillData = {
  name?: string;
  subject?: string;
  shortName?: string; // モバイル用の短縮名
  shortSubject?: string; // モバイル用の短縮名
  level?: number;
  value?: number;
  fullMark?: number;
};

// スキルレーダーコンポーネントの型定義
export type SkillRadarProps = {
  title: string;
  data: SkillData[]; // レーダーチャートのデータ
  dataKey?: string; // レーダーチャートのデータキー（"value" または "level"）
  angleDataKey?: string; // 角度軸のデータキー（"subject" または "name"）
  children?: ReactNode; // 子要素（資格ハイライトなど）
};

// スキルレーダーコンポーネント
export function SkillRadar({
  title,
  data,
  dataKey = "value",
  angleDataKey = "subject",
  children,
}: SkillRadarProps) {
  // モバイル画面かどうかを判定
  const isMobile = useMediaQuery("(max-width: 640px)");
  const isSmallerMobile = useMediaQuery("(max-width: 400px)");

  // データにモバイル用の短縮名がある場合は使用する
  const processedData = useMemo(() => {
    return data.map((item) => {
      // 極端に小さい画面の場合はより短い名前を使用
      if (isSmallerMobile) {
        const shortestName =
          item.shortName?.split("/")[0] || // スラッシュがある場合は最初の部分だけ
          item.shortName ||
          item.name?.substring(0, 2) ||
          item.subject?.substring(0, 2);

        return {
          ...item,
          [angleDataKey]: shortestName,
        };
      }

      // モバイル画面ではshortNameかshortSubjectを使用
      if (isMobile) {
        const shortName =
          angleDataKey === "name"
            ? item.shortName || item.name
            : item.shortSubject || item.subject;

        return {
          ...item,
          [angleDataKey]: shortName,
        };
      }

      // デスクトップではそのまま
      return item;
    });
  }, [data, isMobile, isSmallerMobile, angleDataKey]);

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <div className={`${isMobile ? "h-[350px]" : "h-[400px]"} w-full`}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart
              cx="50%"
              cy="50%"
              outerRadius={isMobile ? "70%" : "80%"}
              data={processedData}
            >
              <PolarGrid stroke="hsl(var(--muted-foreground)/50)" />
              <PolarAngleAxis
                dataKey={angleDataKey}
                tick={{
                  fill: "hsl(var(--foreground))",
                  fontSize: isMobile ? 12 : 14,
                }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 5]}
                tickCount={6}
                stroke="hsl(var(--muted-foreground)/50)"
                tick={{ fontSize: isMobile ? 10 : 12 }}
              />
              <Radar
                name="スキルレベル"
                dataKey={dataKey}
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.6}
              />
              <Legend
                formatter={(value) => `スキルレベル (5段階評価)`}
                wrapperStyle={{ fontSize: isMobile ? 12 : 14 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        {children && <div className="mt-8">{children}</div>}
      </CardContent>
    </Card>
  );
}
