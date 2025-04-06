"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { SkillRadar } from "@/components/skill-radar";
import { ExperienceChart } from "@/components/experience-chart";
import { SkillCategory } from "@/types/skill-types";
import { useMediaQuery } from "@/hooks/use-media-query";

export function SkillsVisualization() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isMounted, setIsMounted] = useState(false);
  const isMobile = useMediaQuery("(max-width: 640px)");

  // クライアントサイドでのみレンダリングするために、コンポーネントがマウントされたかどうかを確認
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // スキルデータを構造化（短縮名を含む）
  const skillCategories: SkillCategory[] = [
    {
      name: "フロントエンド",
      shortName: "FE",
      skills: [
        { name: "TypeScript", shortName: "TS", level: 5 },
        { name: "JavaScript", shortName: "JS", level: 5 },
        { name: "React", shortName: "React", level: 5 },
        { name: "Vue.js", shortName: "Vue", level: 5 },
        { name: "HTML/CSS", shortName: "HTML/CSS", level: 5 },
        { name: "Knockout.js", shortName: "KO", level: 4 },
      ],
    },
    {
      name: "バックエンド",
      shortName: "BE",
      skills: [
        { name: "Node.js", shortName: "Node", level: 4 },
        { name: "C#", shortName: "C#", level: 4 },
        { name: "Python", shortName: "Py", level: 4 },
        { name: "Kotlin", shortName: "Kt", level: 3 },
        { name: "PostgreSQL", shortName: "Pg", level: 4 },
        { name: "SQL Server", shortName: "SQL", level: 3 },
      ],
    },
    {
      name: "AWS",
      shortName: "AWS",
      skills: [
        { name: "Lambda", shortName: "λ", level: 5 },
        { name: "ECS/Fargate", shortName: "ECS", level: 4 },
        { name: "CDK/CloudFormation", shortName: "CDK", level: 4 },
        { name: "DynamoDB/RDS", shortName: "DB", level: 4 },
        { name: "API Gateway", shortName: "API", level: 4 },
        { name: "S3/CloudFront", shortName: "S3/CF", level: 5 },
      ],
    },
    {
      name: "その他",
      shortName: "他",
      skills: [
        { name: "プロジェクト管理", shortName: "PJ", level: 4 },
        { name: "アーキテクチャ設計", shortName: "設計", level: 4 },
        { name: "DevOps", shortName: "DevOps", level: 4 },
        { name: "セキュリティ", shortName: "Sec", level: 4 },
      ],
    },
  ];

  // メインスキルカテゴリ（レーダーチャート用 - 5段階評価）（短縮名を含む）
  const radarData = [
    { subject: "フロントエンド", shortSubject: "FE", value: 5, fullMark: 5 },
    { subject: "バックエンド", shortSubject: "BE", value: 4, fullMark: 5 },
    { subject: "クラウド(AWS)", shortSubject: "AWS", value: 5, fullMark: 5 },
    { subject: "プロジェクト管理", shortSubject: "PJ", value: 4, fullMark: 5 },
    { subject: "アーキテクチャ", shortSubject: "設計", value: 4, fullMark: 5 },
    { subject: "DevOps", shortSubject: "DevOps", value: 4, fullMark: 5 },
  ];

  // 経験年数の推移（折れ線グラフ用）
  const experienceData = [
    { year: 2018, value: 1 },
    { year: 2019, value: 2 },
    { year: 2020, value: 3 },
    { year: 2021, value: 4 },
    { year: 2022, value: 5 },
    { year: 2023, value: 6 },
    { year: 2024, value: 7 },
  ];

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
    );
  }

  return (
    <div className="space-y-6">
      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList
          className={`grid w-full ${isMobile ? "grid-cols-3" : "grid-cols-5"}`}
        >
          <TabsTrigger value="overview">
            {isMobile ? "概要" : "概要"}
          </TabsTrigger>
          <TabsTrigger value="frontend">
            {isMobile ? "FE" : "フロントエンド"}
          </TabsTrigger>
          <TabsTrigger value="backend">
            {isMobile ? "BE" : "バックエンド"}
          </TabsTrigger>
          {!isMobile && <TabsTrigger value="aws">AWS</TabsTrigger>}
          {!isMobile && (
            <TabsTrigger value="experience">
              {isMobile ? "経験" : "経験"}
            </TabsTrigger>
          )}
        </TabsList>

        {/* モバイル用の追加タブ行 */}
        {isMobile && (
          <TabsList className="grid w-full grid-cols-2 mt-2">
            <TabsTrigger value="aws">AWS</TabsTrigger>
            <TabsTrigger value="experience">経験</TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="overview" className="mt-6">
          <SkillRadar
            title={isMobile ? "スキル概要" : "スキルレーダー (5段階評価)"}
            data={radarData}
          >
            <div className="p-4 bg-primary/5 rounded-lg">
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
          </SkillRadar>
        </TabsContent>

        <TabsContent value="frontend" className="mt-6">
          <SkillRadar
            title={
              isMobile ? "フロントエンド" : "フロントエンドスキル (5段階評価)"
            }
            data={skillCategories[0].skills}
            dataKey="level"
            angleDataKey="name"
          />
        </TabsContent>

        <TabsContent value="backend" className="mt-6">
          <SkillRadar
            title={isMobile ? "バックエンド" : "バックエンドスキル (5段階評価)"}
            data={skillCategories[1].skills}
            dataKey="level"
            angleDataKey="name"
          />
        </TabsContent>

        <TabsContent value="aws" className="mt-6">
          <SkillRadar
            title={isMobile ? "AWS" : "AWSスキル (5段階評価)"}
            data={skillCategories[2].skills}
            dataKey="level"
            angleDataKey="name"
          />
        </TabsContent>

        <TabsContent value="experience" className="mt-6">
          <ExperienceChart title="エンジニア経験の推移" data={experienceData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
