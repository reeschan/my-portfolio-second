"use client";

import {
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { useMediaQuery } from "@/hooks/use-media-query";

type ExperienceChartProps = {
  title: string;
  data: { year: number; value: number }[];
};

export function ExperienceChart({ title, data }: ExperienceChartProps) {
  const isMobile = useMediaQuery("(max-width: 640px)");

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <div className={`${isMobile ? "h-[350px]" : "h-[400px]"} w-full`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--muted-foreground)/30)"
              />
              <XAxis
                dataKey="year"
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: isMobile ? 12 : 14 }}
                // モバイルで表示数を減らす
                tickCount={isMobile ? 4 : undefined}
              />
              <YAxis
                domain={[0, 8]}
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: isMobile ? 12 : 14 }}
              />
              <Tooltip
                formatter={(value) => [`${value}年`, "経験年数"]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  fontSize: isMobile ? 12 : 14,
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
