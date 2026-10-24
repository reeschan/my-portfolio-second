// /works の英語版。id・技術・リポジトリ・図は data/works.ts と同じものを使い、文章だけを英語にする
import { works, type Work } from "../works"

type WorkText = Pick<Work, "title" | "description" | "body"> & { alt: string }

const textById: Record<string, WorkText> = {
  portfolio: {
    title: "Portfolio site",
    description:
      "This very site. It presents my career, skills and works in a UI modeled on browser tabs, with an AI chat that answers questions about my career and a three.js 3D background.",
    alt: "Architecture diagram of the portfolio site. Visitors use the React pages and the AI chat in their browser, and Next.js on Vercel renders the pages. /api/chat reads documents such as my résumé from Vercel Blob (private) and streams answers from the Moonshot API (Kimi), and /api/now stores posts I send with curl in Upstash Redis. New posts and questions are notified to Slack.",
    body: `# Overview
A personal portfolio site for an engineer who works from the frontend to cloud infrastructure.
It presents my career, skills and works in a UI modeled on browser tabs.
Recruiters and clients can also ask an AI about my career.

# Features
- A career timeline and skill radar charts
- An AI chat that answers questions about my career (powered by Moonshot's Kimi)
- "Now" posts written in Markdown and Mermaid, published through an API
- A three.js 3D background with seven scenes to choose from
- Clicking a work card opens this dialog with its architecture diagram and write-up
- Switch between Japanese and English from the top right

# Highlights
- Components are split into ui, common, layout and features layers with a fixed dependency direction
- Documents such as my résumé are not kept in the repository but read from Vercel Blob (private), and AI answers are redacted
- E2E and unit tests always mock the LLM; only the local privacy eval calls a real one
- Design decisions are recorded as ADRs, and CI plus a pre-commit gate keep the quality up`,
  },
  tokiline: {
    title: "tokiline",
    description:
      "A framework-agnostic timeline UI. It is mainly a set of CSS and HTML conventions, with an optional React version, and ships zero runtime JavaScript.",
    alt: "Architecture diagram of tokiline. In the GitHub repository, the CSS and HTML conventions, TypeScript helpers and React components are built with tsdown and Lightning CSS. GitHub Actions runs CI on every push, publishes to npm and deploys the demo site. Consuming apps (plain HTML, Next.js, Tailwind CSS v4, Vue, Svelte or Astro) install it, and the browser draws the timeline without runtime JavaScript.",
    body: `# Overview
A framework-agnostic UI component for drawing vertical timelines.
The core is a set of CSS and HTML conventions; the React version is only for those who want it.
It is published on npm.

# Features
- CSS and HTML conventions that work with any framework, or none
- An optional React version that renders as Server Components (supports both the App Router and the Pages Router in Next.js)
- Choose which side cards sit on (Side) and how they fold when narrow (Collapse)
- A scroll-in animation for items (Reveal), done with CSS alone
- Styling through --toki-* CSS variables, which also fits Tailwind CSS v4 and shadcn/ui themes

# Highlights
- Zero runtime JavaScript, with every rule inside a cascade layer, so your own CSS and Tailwind classes win without !important
- Folding is decided by the timeline's own width (container queries), not the viewport. Sides are logical directions, so it flips automatically for right-to-left languages
- Only features that are Baseline widely available are used. Even Reveal keeps the content and layout intact in browsers that don't support it`,
  },
  atelier: {
    title: "Atelier",
    description:
      "A Claude Code skill (formerly pbi-orchestration-jev) that runs development as a nine-stage workflow template. By default it splits multi-file implementations into PBIs and hands them to sub-agents; a decision table picks the model, and verification commands decide pass or fail.",
    alt: "Architecture diagram of Atelier. The Claude Code orchestrator asks Jev about PBI quality through prepare.py, picks a tier and the order of runners with select_model.py, and hands PBIs to pbi-worker (the Agent tool) or to external runners such as opencode, Codex, Antigravity and DeepSeek Harness. It verifies each PBI with verify.py and unchanged.py and records status and hand-offs under docs/pbi/ in the target repository. Runners and models, routing and workflow templates are edited as home settings in a local editor.",
    body: `# Overview
A Claude Code skill that runs development as a "workflow template". It was formerly called pbi-orchestration-jev.
Each of nine stages (understand, design, plan, route, build, verify, review, fix, finish) is filled by a component you can swap.
The default template splits multi-file implementations into PBIs (Product Backlog Items) and hands them to sub-agents.
The main session acts as the orchestrator, handling drafting, model assignment, review and send-backs.
The implementation itself is done by opencode (DeepSeek), the Codex CLI, the Antigravity CLI, DeepSeek Harness and Claude Code's Agent tool.

# Features
- Keeps the components of each stage as data (templates), so components and templates can be swapped without editing the skill
- Picks the model tier (haiku / sonnet / opus) from facts such as the number of changed files and a summary judgment
- Outputs, per tier, the order of runners to try, moving on when one hits a usage limit or an error
- Runs the verification commands itself and checks each acceptance criterion one by one
- Allows up to two send-backs, then stops and waits for the user's decision
- Writes a hand-off when the context grows, and resumes after /clear
- Records every run and sums tokens, cost and results per model
- Lets you edit runners and models, routing and templates together in a local editor

# Highlights
- The last component of every stage is a built-in or a script, so a run needs nothing beyond Claude Code
- Model routing is decided by a decision table, not gut feeling, and is covered by tests
- Pass or fail comes from actually running the verification commands, not from a sub-agent's report or the judgment API
- Only text is sent to the Jev judgment API, never source code, diffs, environment variables or credentials
- Workers end with a five-line report and keep the details in files, so the orchestrator's context stays small`,
  },
  "shared-memory": {
    title: "shared-memory",
    description:
      "A knowledge base shared by several AI agents and me. A RAG that runs entirely on my local PC, with Markdown as the single source of truth.",
    alt: "Architecture diagram of shared-memory. Claude Code, Codex and Kimi Code send search / get / write to an MCP server on 127.0.0.1. The core shared by the MCP server and the CLI uses Markdown (source of truth), SQLite (access stats), Ollama (embeddings) and OpenSearch + Sudachi on Docker (derived index). A task scheduler runs the CLI's decay / gc regularly, and the developer reviews the Markdown diff, commits it and pushes it to GitHub.",
    body: `# Overview
A knowledge base that Claude Code, Codex, Kimi and I all refer to.
It runs as a RAG entirely on my local PC.
The knowledge itself lives in Markdown files, and the search index can be rebuilt at any time.

# Features
- Agents use three MCP tools: search, get and write
- A single hybrid query combines BM25 search with Japanese morphological analysis (Sudachi) and vector search over embeddings
- Results are re-scored by time decay, access count and source, then grouped by memory
- The CLI rebuilds the index, updates access stats and cleans up superseded memories

# Highlights
- Markdown is the single source of truth and OpenSearch is a derived index, so losing the index only means rebuilding it
- Existing memories are never rewritten; an update is a new file that points to the original, which keeps the history
- Writes that look like secrets are rejected, and every port is bound to 127.0.0.1
- Search results and memory bodies are treated as data, never as instructions`,
  },
  "management-self-pieces": {
    title: "management-self-pieces",
    description:
      "A personal web app that shows my work as nodes in a 3D graph and manages tickets in Asana. Each repository's node.yaml is the source of truth for its node.",
    alt: "Architecture diagram of management-self-pieces. The owner uses the Next.js app on Vercel from a 3D dashboard in the browser, and the app stores display data in Neon. node.yaml files on GitHub and Asana tickets are the source of truth; pushes and task updates arrive by webhook, and a daily cron re-imports them. Sign-in uses Google / GitHub OAuth through Better Auth.",
    body: `# Overview
A personal web app that treats my work (apps, skills, documents) as "nodes" and shows them as a graph floating in 3D space.
Tickets are managed in Asana projects.
Each node's content comes from node.yaml in its repository; the app's database is only a cache for display.

# Features
- A 3D dashboard that shows nodes as a graph with their relationships
- A detail panel with the node's Markdown, its diagrams and its tickets
- Maps each node one-to-one to an Asana project and receives updates by webhook
- Re-reads a repository's node.yaml on GitHub App push webhooks

# Highlights
- The source of truth lives in node.yaml on GitHub and in Asana, so the database can be rebuilt from them if it is lost
- On top of webhooks, a daily cron re-imports everything to catch anything missed
- Sign-in is Google / GitHub OAuth through Better Auth`,
  },
  "tracking-health": {
    title: "TrackingHealth",
    description:
      "A personal PWA for logging weight, meals and exercise to help reach my goals. It estimates nutrition from meal photos and offers AI analysis of the logs.",
    alt: "Architecture diagram of TrackingHealth. I log from a phone browser (PWA), and Next.js on Vercel checks sign-in with Better Auth and Google OAuth. The logging API stores data in Upstash Redis and imports weight from Health Planet. The AI API uses Anthropic's Claude for image analysis and chat, and builds recipes from YouTube videos. A migration batch at startup moves the Redis data.",
    body: `# Overview
A personal PWA for logging weight, meals and exercise to help reach my goals.
Quick logging on a phone was the top priority.
It estimates nutrition from meal photos and offers AI analysis based on the logs.

# Features
- Log weight, meals and exercise, and see today's status and weekly charts on a dashboard
- AI estimates nutrition from meal photos
- A chat for asking the AI about the logs, and recipes generated from a dish name or a YouTube video
- Body analysis (basal metabolism, calories burned, calorie balance, goal forecast, plateau detection) and per-exercise trends
- Import weight from Health Planet and export a chosen period as JSON

# Highlights
- The session lives in an encrypted cookie and the logs in Redis. A permanent user ID is looked up from the email address, so the same person is recognized even if their OAuth ID changes
- AI output is validated against zod schemas
- TypeScript strict mode, type-aware ESLint, Vitest, CI and CodeQL keep the quality up
- The repository is private, so only the diagram and the write-up are shown here`,
  },
}

// 英語の文章が欠けている作品は日本語のまま出す (作品を足したときに英語版の書き忘れで消えないようにする)
export const worksEn: Work[] = works.map((work) => {
  const text = textById[work.id]
  if (!text) return work
  const { alt, ...rest } = text
  return { ...work, ...rest, architecture: { ...work.architecture, alt } }
})
