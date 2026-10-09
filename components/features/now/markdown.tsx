import type { Element, ElementContent } from "hast"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { TextLink } from "@/components/common"
import { MermaidDiagram } from "./mermaid-diagram"

type MarkdownProps = {
  children: string
}

// /now の記事本文。GFM (表・チェックリスト・打ち消し線) と ```mermaid の図に対応する
// 生の HTML は描かない (react-markdown の既定)。画像の埋め込みは扱わない (PBI-0004)
export function Markdown({ children }: MarkdownProps) {
  return (
    <div className="space-y-4 leading-relaxed text-foreground/90">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}

// 本文の見出しはダイアログの題 (h2) の下に入るので、# を h3 から始める
const components: Components = {
  h1: ({ children }) => <h3 className="mt-6 border-b border-border/30 pb-1 text-xl font-semibold">{children}</h3>,
  h2: ({ children }) => <h4 className="mt-6 text-lg font-semibold">{children}</h4>,
  h3: ({ children }) => <h5 className="mt-4 font-semibold">{children}</h5>,
  h4: ({ children }) => <h6 className="mt-4 font-semibold">{children}</h6>,
  h5: ({ children }) => <h6 className="mt-4 font-semibold">{children}</h6>,
  h6: ({ children }) => <h6 className="mt-4 font-semibold">{children}</h6>,
  a: ({ href, children }) => <TextLink href={href ?? "#"}>{children}</TextLink>,
  ul: ({ children }) => <ul className="list-disc space-y-1 pl-6">{children}</ul>,
  // チェックリストの項目は、黒丸の代わりにチェックボックスを印にする
  li: ({ children, className }) => <li className={className?.includes("task-list-item") ? "-ml-5 list-none" : undefined}>{children}</li>,
  ol: ({ children }) => <ol className="list-decimal space-y-1 pl-6">{children}</ol>,
  blockquote: ({ children }) => <blockquote className="border-l-4 border-primary/50 pl-4 text-muted-foreground">{children}</blockquote>,
  hr: () => <hr className="border-border/30" />,
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-border/40 bg-muted/40 px-3 py-1.5 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border border-border/40 px-3 py-1.5">{children}</td>,
  code: ({ children, className }) => (
    <code className={className ?? "rounded-sm bg-muted/60 px-1.5 py-0.5 font-mono text-[0.9em]"}>{children}</code>
  ),
  pre: ({ node, children }) => {
    const mermaid = mermaidCodeOf(node)
    if (mermaid !== null) return <MermaidDiagram code={mermaid} />
    return <pre className="overflow-x-auto rounded-md border border-border/30 bg-background/60 p-4 font-mono text-sm">{children}</pre>
  },
}

// <pre><code class="language-mermaid">…</code></pre> なら中のコードを返す
function mermaidCodeOf(pre: Element | undefined): string | null {
  const code = pre?.children.find((child): child is Element => child.type === "element" && child.tagName === "code")
  const classes = code?.properties.className
  if (!code || !Array.isArray(classes) || !classes.includes("language-mermaid")) return null
  return textOf(code.children).trimEnd()
}

function textOf(nodes: ElementContent[]): string {
  return nodes.map((n) => (n.type === "text" ? n.value : n.type === "element" ? textOf(n.children) : "")).join("")
}
