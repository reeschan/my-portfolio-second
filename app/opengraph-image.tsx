import { ImageResponse } from "next/og"
import { displayHost, ogImage } from "@/lib/metadata"
import { ogImageColors } from "@/lib/theme"

// SNS に URL を貼ったときに出る画像。子のページも同じ画像を使う (ADR 0029)
// 既定のフォントは日本語の字形を持たないので、文字は英語だけにする
export const alt = ogImage.alt
export const size = { width: ogImage.width, height: ogImage.height }
export const contentType = "image/png"

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 96px",
        background: ogImageColors.background,
        color: ogImageColors.foreground,
      }}
    >
      <div style={{ display: "flex", fontSize: 96, fontWeight: 700, color: ogImageColors.primary }}>Ryuki Tobita</div>
      <div style={{ display: "flex", marginTop: 16, fontSize: 48 }}>Full-stack Developer</div>
      <div style={{ display: "flex", marginTop: 40, fontSize: 32, color: ogImageColors.muted }}>Frontend · Backend · AWS · AI agents</div>
      <div style={{ display: "flex", marginTop: 72, fontSize: 28, color: ogImageColors.primary }}>{displayHost}</div>
    </div>,
    size,
  )
}
