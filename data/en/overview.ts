// /overview の英語版。並びと href は data/overview.ts と揃える
import type { PageGuide, Profile } from "../overview"

export const profileEn: Profile = {
  name: "Ryuki Tobita",
  role: "Full-stack developer",
  avatar: { src: "/profile/avatar.webp", alt: "Ryuki Tobita's icon: an illustration of a character in a cap making a peace sign" },
  summary: [
    "I'm a full-stack developer who builds products end to end on my own, from the frontend and backend to the cloud infrastructure.",
    "Since 2025 I have been working as a freelancer on web application development, search improvements and AI-powered features.",
    "Lately I've been focusing on combining AI agents such as Claude Code to build apps and tools quickly and reliably.",
  ],
}

export const pageGuidesEn: readonly PageGuide[] = [
  { href: "/career", description: "My past employers and freelance projects, on a timeline with the newest first." },
  { href: "/skills", description: "My frontend, backend, AWS and other skills on five-level radar charts." },
  { href: "/works", description: "Apps and tools I've built, with architecture diagrams and write-ups." },
  { href: "/now", description: "Blog-style posts on what I'm working on now and what I've learned while building." },
  { href: "/chat", description: "Ask an AI about my career." },
  { href: "/theme", description: "Choose the 3D scene in the background." },
]
