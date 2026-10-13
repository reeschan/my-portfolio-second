// /career の英語版。並びと参画先は data/career.ts と揃える
import type { CareerEntry } from "../career"

export const careerDataEn: CareerEntry[] = [
  {
    type: "freelance",
    title: "Freelance",
    subtitle: "Self-employed",
    description:
      "Focused on web application development, covering everything from the frontend to cloud infrastructure, search and AI integrations.",
    startDate: "Mar 2025",
    ongoing: true,
    engagements: [
      {
        client: "Forgers",
        summary: "Web application development for a project that works with VR and 3D models.",
        points: [],
      },
      {
        client: "STRACT",
        summary: "Development of the Plug app.",
        points: ["Improved search", "Built AI integration features", "Joined the UI redesign project"],
      },
      {
        client: "Other",
        summary: "Beyond the above, I have worked on web application development for several other companies.",
        points: [],
      },
    ],
  },
  {
    type: "work",
    title: "Tokio Marine & Nichido Systems Co., Ltd.",
    subtitle: "Full-time",
    description:
      "In the Digital Innovation Development Department, built in-house systems for the Tokio Marine Group, mainly through agile Scrum development.",
    startDate: "Apr 2022",
    endDate: "Dec 2024",
  },
  {
    type: "work",
    title: "AMIYA Corporation",
    subtitle: "Full-time",
    description:
      "Developed ALog Converter, the company's own security software package, mainly on the frontend, building features based on customer requests.",
    startDate: "Aug 2018",
    endDate: "Mar 2022",
  },
]
