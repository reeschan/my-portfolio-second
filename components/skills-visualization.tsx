"use client"

import { useState, useEffect } from "react"
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from "recharts"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"

export function SkillsVisualization() {
  const [activeTab, setActiveTab] = useState("overview")
  const [isMounted, setIsMounted] = useState(false)

  // クライアントサイドでのみレンダリングするために、コンポーネントがマウントされたかどうかを確認
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // メインスキルカテゴリ（レーダーチャート用）
  const radarData = [
    { subject: "フロントエンド", A: 95, fullMark: 100 },
    { subject: "バックエンド", A: 85, fullMark: 100 },
    { subject: "クラウド(AWS)", A: 90, fullMark: 100 },
    { subject: "プロジェクト管理", A: 85, fullMark: 100 },
    { subject: "アーキテクチャ設計", A: 80, fullMark: 100 },
    { subject: "DevOps", A: 75, fullMark: 100 },
  ]

  // フロントエンドスキル詳細（棒グラフ用）
  const frontendSkills = [
    { name: "TypeScript", value: 95 },
    { name: "JavaScript", value: 95 },
    { name: "React", value: 90 },
    { name: "Vue.js", value: 90 },
    { name: "HTML/CSS", value: 90 },
    { name: "Knockout.js", value: 85 },
  ]

  // バックエンドスキル詳細（棒グラフ用）
  const backendSkills = [
    { name: "Node.js", value: 85 },
    { name: "C#", value: 80 },
    { name: "Python", value: 75 },
    { name: "Kotlin", value: 65 },
    { name: "PostgreSQL", value: 80 },
    { name: "SQL Server", value: 60 },
  ]

  // AWSスキル詳細（棒グラフ用）
  const awsSkills = [
    { name: "Lambda", value: 90 },
    { name: "ECS/Fargate", value: 85 },
    { name: "CDK/CloudFormation", value: 85 },
    { name: "DynamoDB/RDS", value: 80 },
    { name: "API Gateway", value: 80 },
    { name: "S3/CloudFront", value: 90 },
  ]

  // 経験年数の推移（折れ線グラフ用）
  const experienceData = [
    { year: 2018, value: 1 },
    { year: 2019, value: 2 },
    { year: 2020, value: 3 },
    { year: 2021, value: 4 },
    { year: 2022, value: 5 },
    { year: 2023, value: 6 },
    { year: 2024, value: 7 },
  ]

  // クライアントサイドでのみレンダリング
  if (!isMounted) {
    return (
      <div className="space-y-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">概要</TabsTrigger>
            <TabsTrigger value="frontend">フロントエンド</TabsTrigger>
            <TabsTrigger value="backend">バックエンド</TabsTrigger>
            <TabsTrigger value="aws">AWS</TabsTrigger>
            <TabsTrigger value="experience">経験</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-semibold mb-4">スキルレーダー</h2>
                <div className="h-[400px] w-full bg-muted/20 animate-pulse rounded-md"></div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="frontend">フロントエンド</TabsTrigger>
          <TabsTrigger value="backend">バックエンド</TabsTrigger>
          <TabsTrigger value="aws">AWS</TabsTrigger>
          <TabsTrigger value="experience">経験</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-4">スキルレーダー</h2>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="hsl(var(--muted-foreground)/50)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--foreground))", fontSize: 14 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="hsl(var(--muted-foreground)/50)" />
                    <Radar
                      name="スキルレベル"
                      dataKey="A"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.6}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-8 p-4 bg-primary/5 rounded-lg">
                <h2 className="text-xl font-semibold mb-2">資格ハイライト</h2>
                <ul className="list-disc pl-5 space-y-1">
                  <li>応用情報技術者</li>
                  <li>AWS認定ソリューションアーキテクト - プロフェッショナル</li>
                  <li>AWS認定DevOpsエンジニア - プロフェッショナル</li>
                  <li>AWS認定セキュリティ - スペシャリティ</li>
                  <li>AWS認定機械学習 - スペシャリティ</li>
                  <li>その他AWS資格5つ保持</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="frontend" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-4">フロントエンドスキル</h2>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={frontendSkills} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground)/30)" />
                    <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                    <YAxis dataKey="name" type="category" width={100} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      formatter={(value) => [`${value}/100`, "習熟度"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                      }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backend" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-4">バックエンドスキル</h2>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={backendSkills} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground)/30)" />
                    <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                    <YAxis dataKey="name" type="category" width={100} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      formatter={(value) => [`${value}/100`, "習熟度"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                      }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aws" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-4">AWSスキル</h2>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={awsSkills} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground)/30)" />
                    <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                    <YAxis dataKey="name" type="category" width={120} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      formatter={(value) => [`${value}/100`, "習熟度"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                      }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="experience" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-4">エンジニア経験の推移</h2>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={experienceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground)/30)" />
                    <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" />
                    <YAxis domain={[0, 8]} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      formatter={(value) => [`${value}年`, "経験年数"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                      }}
                    />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

