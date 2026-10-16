import type { ReactNode } from "react"
import type { Element, ElementContent } from "hast"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { TextLink } from "./text-link"
import { MermaidDiagram } from "./mermaid-diagram"

type MarkdownProps = {
  children: string
  // 見出しの開始タグ (Markdown の # をどの見出しにするか)。既定は 3: この本文はダイアログの題 (h2) の下に入るから。記事のページ (/now/[id]) では題名が h1 になるので 2 を渡す
  headingStart?: 2 | 3
}

// /now の記事と /works の作品の詳細の本文。GFM (表・チェックリスト・打ち消し線) と ```mermaid の図に対応する
// 生の HTML は描かない (react-markdown の既定)。画像の埋め込みは扱わない (PBI-0004)
export function Markdown({ children, headingStart = 3 }: MarkdownProps) {
  return (
    <div className="space-y-4 leading-relaxed text-foreground/90">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={componentsByHeadingStart[headingStart]}>
        {children}
      </ReactMarkdown>
    </div>
  )
}

// Markdown の本文の見出し (1〜6) と、headingStart ごとの描き方の集まりで使う見出しのキー (h1〜h6)
type HeadingSource = 1 | 2 | 3 | 4 | 5 | 6
type HeadingKeys = "h1" | "h2" | "h3" | "h4" | "h5" | "h6"

// 見出しの className は Markdown の階層ごとに決めていて、# は h1 の行のもの、## は h2 の行のものを使う。描くタグをずらしてもそのままにする
const headingClassNames: Record<HeadingSource, string> = {
  1: "mt-6 border-b border-border/30 pb-1 text-xl font-semibold",
  2: "mt-6 text-lg font-semibold",
  3: "mt-4 font-semibold",
  4: "mt-4 font-semibold",
  5: "mt-4 font-semibold",
  6: "mt-4 font-semibold",
}

// Markdown の # を h{headingStart} から始める見出し (## はその次の見出し)。
// className は Markdown の階層ごとのものを使い、変わるのは描くタグだけ
function Heading({ source, headingStart, children }: { source: HeadingSource; headingStart: 2 | 3; children?: ReactNode }) {
  const className = headingClassNames[source]
  // h6 を超えたら h6 に止める
  const tag = Math.min(source + headingStart - 1, 6)
  if (tag === 2) return <h2 className={className}>{children}</h2>
  if (tag === 3) return <h3 className={className}>{children}</h3>
  if (tag === 4) return <h4 className={className}>{children}</h4>
  if (tag === 5) return <h5 className={className}>{children}</h5>
  return <h6 className={className}>{children}</h6>
}

// Markdown の # を h{headingStart} から始め、## をその次の見出しにずらす
function headingComponents(headingStart: 2 | 3): Pick<Components, HeadingKeys> {
  return {
    h1: ({ children }) => (
      <Heading source={1} headingStart={headingStart}>
        {children}
      </Heading>
    ),
    h2: ({ children }) => (
      <Heading source={2} headingStart={headingStart}>
        {children}
      </Heading>
    ),
    h3: ({ children }) => (
      <Heading source={3} headingStart={headingStart}>
        {children}
      </Heading>
    ),
    h4: ({ children }) => (
      <Heading source={4} headingStart={headingStart}>
        {children}
      </Heading>
    ),
    h5: ({ children }) => (
      <Heading source={5} headingStart={headingStart}>
        {children}
      </Heading>
    ),
    h6: ({ children }) => (
      <Heading source={6} headingStart={headingStart}>
        {children}
      </Heading>
    ),
  }
}

// 見出し以外の要素の描き方。headingStart によらないので 1 つだけ作る
const otherComponents: Omit<Components, HeadingKeys> = {
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

// headingStart ごとの描き方。描画のたびに作り直さないよう、2 と 3 の 2 通りをモジュールの定数で用意して選ぶ
const componentsByHeadingStart: Record<2 | 3, Components> = {
  2: { ...otherComponents, ...headingComponents(2) },
  3: { ...otherComponents, ...headingComponents(3) },
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
