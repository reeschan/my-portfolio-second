"use client"

import { useEffect, useId, useRef } from "react"

type MermaidDiagramProps = {
  code: string
}

// ```mermaid のコードブロックを図にする。mermaid は大きいので、図があるときだけ読み込む
// 描いた SVG は ref に直接差し込む (useEffect の中で setState しないため。docs/design/components.md)
export function MermaidDiagram({ code }: MermaidDiagramProps) {
  const figureRef = useRef<HTMLElement>(null)
  const svgRef = useRef<HTMLDivElement>(null)
  // mermaid は id を CSS セレクタにも使うので、useId の記号 (:) を落とす
  const id = `mermaid-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`

  useEffect(() => {
    let cancelled = false
    void renderDiagram(id, code).then((svg) => {
      const figure = figureRef.current
      const target = svgRef.current
      if (cancelled || !figure || !target) return
      // React が中身を持たない div にだけ差し込む。元のコードの <pre> は data-state で隠す
      target.innerHTML = svg ?? ""
      figure.dataset.state = svg === null ? "error" : "rendered"
    })
    return () => {
      cancelled = true
    }
  }, [id, code])

  return (
    <figure
      ref={figureRef}
      aria-label="Mermaid の図"
      className="group my-4 overflow-x-auto rounded-md border border-border/30 bg-background/40 p-4"
    >
      {/* 描き終わるまでと描けなかったときは、元のコードをそのまま見せる */}
      <pre className="font-mono text-xs text-muted-foreground group-data-[state=rendered]:hidden">{code}</pre>
      <div ref={svgRef} className="flex justify-center [&_svg]:h-auto [&_svg]:max-w-full" />
    </figure>
  )
}

// 描けたら SVG の文字列、構文の誤りなどで描けなければ null
async function renderDiagram(id: string, code: string): Promise<string | null> {
  try {
    const { default: mermaid } = await import("mermaid")
    // strict: 図の中のクリック動作やスクリプトを無効にする (投稿は信頼できる本人だけが書くが、念のため)
    mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "strict", suppressErrorRendering: true })
    if (!(await mermaid.parse(code, { suppressErrors: true }))) return null
    const { svg } = await mermaid.render(id, code)
    return svg
  } catch {
    return null
  }
}
