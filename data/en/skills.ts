// /skills の英語版。カテゴリ・スキルの並びとレベルは data/skills.ts と揃える
import type { SkillCategory } from "@/types/skill-types"
import type { RadarDatum } from "../skills"

export const skillCategoriesEn: SkillCategory[] = [
  {
    id: "frontend",
    name: "Frontend",
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
    id: "backend",
    name: "Backend",
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
    id: "aws",
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
    id: "other",
    name: "Other",
    shortName: "Other",
    skills: [
      { name: "Project management", shortName: "PM", level: 4 },
      { name: "Architecture design", shortName: "Arch", level: 4 },
      { name: "DevOps", shortName: "DevOps", level: 4 },
      { name: "Security", shortName: "Sec", level: 4 },
    ],
  },
]

export const radarDataEn: RadarDatum[] = [
  { subject: "Frontend", shortSubject: "FE", value: 5, fullMark: 5 },
  { subject: "Backend", shortSubject: "BE", value: 4, fullMark: 5 },
  { subject: "Cloud (AWS)", shortSubject: "AWS", value: 5, fullMark: 5 },
  { subject: "Project management", shortSubject: "PM", value: 4, fullMark: 5 },
  { subject: "Architecture", shortSubject: "Arch", value: 4, fullMark: 5 },
  { subject: "DevOps", shortSubject: "DevOps", value: 4, fullMark: 5 },
]

export const certificationsEn: readonly string[] = [
  "Applied Information Technology Engineer",
  "AWS Certified Solutions Architect – Professional",
  "AWS Certified DevOps Engineer – Professional",
  "AWS Certified Security – Specialty",
  "AWS Certified Machine Learning – Specialty",
  "Five other AWS certifications",
]
