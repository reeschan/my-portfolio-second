import { GlassPanel } from "@/components/common"

// 本文のパネルが届くまでの枠 (ADR 0035)。殻なので言語の文言は使わない。
// 見出しの場所も空けておき、本文が届いたときにタイトルとパネルの位置が跳ねないようにする
export function PanelFrameFallback() {
  return (
    <>
      {/* ページの h1 (text-4xl の 1 行 + mb-6) と同じ高さを取る */}
      <div className="mb-6 h-10" aria-hidden="true" />
      <GlassPanel>
        {/* 読み込み中を示す aria-busy は中の線が持つ */}
        <PanelBodyFallback />
      </GlassPanel>
    </>
  )
}

// パネルの中身が届くまでの線。見出しとパネルを殻に持つページは、パネルの中にこれだけを出す (ADR 0036)。
// 中身は控えめな線だけにする。読み込み中だと分かる程度に留め、本文の形は決めない
export function PanelBodyFallback() {
  return (
    <div className="space-y-3" aria-busy="true">
      <div className="h-4 w-1/3 rounded bg-foreground/10" aria-hidden="true" />
      <div className="h-4 w-full rounded bg-foreground/5" aria-hidden="true" />
      <div className="h-4 w-5/6 rounded bg-foreground/5" aria-hidden="true" />
      <div className="h-4 w-2/3 rounded bg-foreground/5" aria-hidden="true" />
    </div>
  )
}
