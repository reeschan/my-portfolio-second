// 画面の固定の文言 (英語)。キーは ja.ts と同じ
import type { Messages } from "./ja"

export const en: Messages = {
  // 検索結果と OGP に出すサイトの説明。ページごとの説明がないトップで使う
  site: {
    description:
      "Portfolio of Ryuki Tobita, a full-stack developer who builds everything from the frontend to cloud infrastructure. Career, skills, and works, plus an AI chat that answers questions about my career.",
  },
  nav: {
    overview: "Overview",
    career: "Career",
    skills: "Skills",
    works: "Works",
    now: "Now",
    chat: "Chat",
    contact: "Contact",
    theme: "Theme",
  },
  layout: {
    pages: "Pages",
    rss: "RSS feed",
    rssTitle: "Subscribe to the RSS feed",
    language: "Language",
    close: "Close",
  },
  intro: {
    loading: "Loading",
    complete: "Loaded",
  },
  overview: {
    description:
      "Profile of Ryuki Tobita, a full-stack developer who builds everything from the front end to cloud infrastructure, with links to GitHub and LinkedIn and a guide to this site.",
    profile: "Profile",
    profileLinks: "Elsewhere",
    guide: "How to explore this site",
    guideList: "Page guide",
  },
  career: {
    description:
      "Ryuki Tobita's career: past employers and, since 2025, freelance engagements in web app development, search improvements and AI integrations, in a timeline from newest to oldest.",
    present: "Present",
    ongoing: "Ongoing",
    clients: "Clients",
    engagements: "Project details",
    tech: "Tech stack",
  },
  skills: {
    description:
      "Front-end, back-end and AWS skills on five-level radar charts, with the languages, frameworks and cloud services used so far and the certifications held.",
    overviewTab: "Overview",
    overviewTitle: "Skill radar (out of 5)",
    overviewTitleShort: "Skills overview",
    categoryTitle: (category: string) => `${category} skills (out of 5)`,
    certifications: "Certifications",
    level: "Skill level",
    legend: "Skill level (out of 5)",
  },
  works: {
    description:
      "Apps and tools built by Ryuki Tobita, each with its purpose, the technologies used and an architecture diagram showing how it was built.",
    tech: "Tech stack",
    architecture: "Architecture",
    repository: "Repository: ",
    privateRepository: "The repository is private",
    enlarge: "Enlarge the architecture diagram",
    enlargeHint: "Tap the diagram to enlarge it",
    viewerTitle: (title: string) => `${title} architecture`,
    openOriginal: "Open the original diagram in a new tab",
  },
  imageViewer: {
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    zoomFit: "Fit to screen",
    diagramArea: "Diagram area",
    zoomLevel: "Zoom level",
    openOriginal: "Open the original image in a new tab",
    enlargeImage: "Enlarge the image",
    enlargeHint: "Tap the image to enlarge it",
  },
  now: {
    description:
      "Blog-style posts by Ryuki Tobita on current work and lessons learned in development, newest first. Also available as an RSS feed.",
    intro: "What I'm working on right now, newest first.",
    updatedBefore: " Updated ",
    updatedAfter: "",
    // 英語版の無い記事は日本語のまま出す。表示の不具合と取り違えないよう、印と断り書きで日本語だと伝える
    japaneseOnlyBadge: "In Japanese",
    japaneseOnlyNote: "This post is available in Japanese only.",
    machineTranslatedNote: "Machine-translated from Japanese.",
    loadError: "Couldn't load the posts. Please try again later.",
    empty: "No posts yet.",
    recent: "Recent posts",
    backToList: "Back to all posts",
    // Title of the image viewer for a post image (PBI-0024)
    imageViewerTitle: (title: string) => `Images in ${title}`,
    dialogUpdatedBefore: " (updated ",
    dialogUpdatedAfter: ")",
    inspiredBefore: "This page follows the idea of ",
    inspiredAfter: ".",
  },
  chat: {
    description:
      "Ask an AI about Ryuki Tobita's career. It answers questions about experience, skills and past engagements based on the resume.",
    greeting: "Hi! Feel free to ask anything about my career and skills.",
    suggestions: [
      "Give me a quick summary of your career",
      "What is your strongest tech stack?",
      "Tell me about your leadership experience",
      "What AWS experience and certifications do you have?",
    ],
    log: "Conversation",
    thinking: "Thinking…",
    empty: "The answer was empty. Please try again.",
    failed: "Couldn't get an answer.",
    placeholder: "Ask about my career...",
    input: "Question",
    send: "Send",
    note: [
      "The AI gives a rough overview of my career, skills and personality, and may answer in Japanese.",
      "For details, please reach out on LinkedIn or by email.",
    ],
  },
  contact: {
    description:
      "Send Ryuki Tobita a work request or a question through this form. Write your name, email address and message, and you will get a reply by email.",
    lead: "For work inquiries or questions, please send me a message here.",
    name: "Name",
    email: "Email",
    message: "Message",
    messageHint: "10–2000 characters",
    privacy: "Your information is used only to reply to you and is never shared with third parties.",
    submit: "Send",
    sending: "Sending…",
    receivedTitle: "Your message has been received",
    receivedBody: "I will reply to the email address you provided.",
    again: "Send another message",
    errors: {
      invalid: "Please check your input.",
      tooMany: "Too many messages. Please wait a while and try again.",
      unavailable: "Messages can't be accepted right now.",
      failed: "Couldn't send your message. Please try again later.",
    },
    nameRequired: "Please enter your name.",
    nameTooLong: "Please keep your name within 100 characters.",
    emailInvalid: "Please enter a valid email address.",
    messageLength: "Please write a message of 10–2000 characters.",
  },
  notFound: {
    title: "Page not found",
    heading: "Page not found",
    body: "The page you are looking for may have been moved or deleted.",
    home: "Go to the top page",
    now: "Read the Now posts",
    works: "See the works",
  },
  theme: {
    description: "Choose the 3D scene that plays behind this site, from seven options such as Glass, Grid and Aurora.",
    heading: "Choose a background",
    intro: "Switch the 3D scene that plays behind the whole site. Your choice is saved in this browser and used the next time you visit.",
    legend: "Background theme",
    themes: {
      glass: { label: "Glass", description: "Glass shards drifting through violet light and smoke" },
      grid: { label: "Grid", description: "Floating polyhedra and particles" },
      aurora: { label: "Aurora", description: "An aurora over snowy ridges, mirrored in a frozen lake" },
      "moonlit-sea": { label: "Moonlit sea", description: "A full moon between clouds and its path across the waves" },
      "firefly-forest": { label: "Firefly forest", description: "Fireflies drifting through a misty conifer forest" },
      "lunar-surface": { label: "Lunar surface", description: "Earth rising over a cratered lunar horizon" },
      eclipse: { label: "Total eclipse", description: "A black sun and its corona in the dark, with drifting nebulae" },
    },
  },
}
