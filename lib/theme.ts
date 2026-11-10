// three.js など CSS 変数を読めない描画先に渡すテーマ色。
// sceneColors の値は app/globals.css の .dark (既定テーマ) と揃える。トークンを変えたらここも直す (docs/design/theme.md)
export const sceneColors = {
  primary: "#3399ff", // --primary: 210 100% 60%
  secondary: "#2e2e38", // --secondary: 240 10% 20%
  accent: "#2e2e38", // --accent: 240 10% 20%
  gridCenter: "#20252f", // --muted-foreground (10%) を背景に重ねた色
  grid: "#191e28", // --muted-foreground (5%) を背景に重ねた色
} as const

// glass テーマの背景の配色。この 4 色が正本で、app/globals.css に対応するトークンは無い。
// three.js は CSS 変数を読めないので 16 進で持ち、シェーダー (components/features/background/themes/glass.tsx) と
// /theme の見本 (lib/background-theme.ts) の両方がここから読む。
// シーンは常に暗い地の上に描くので、ライト・ダークで同じ値になる。
export const glassColors = {
  backdrop: "#0e121b", // 地の紺
  violet: "#9b7bff", // 紫の光
  pink: "#ff6fb5", // 桃色の光
  teal: "#45d4dc", // 青緑の光
} as const

// recharts など、色を文字列で受け取るライブラリに渡すトークン参照
export const chartColors = {
  primary: "hsl(var(--primary))",
  foreground: "hsl(var(--foreground))",
  grid: "hsl(var(--muted-foreground) / 0.5)",
} as const

// OGP の画像 (app/opengraph-image.tsx) のための色。画像は CSS 変数を読めないので、.dark の値を 16 進で持つ
export const ogImageColors = {
  background: "#121721", // --background: 220 30% 10%
  foreground: "#f9fafa", // --foreground: 220 10% 98%
  muted: "#a1a1aa", // --muted-foreground: 240 5% 65%
  primary: sceneColors.primary,
} as const
