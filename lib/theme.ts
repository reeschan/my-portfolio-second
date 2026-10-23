// CSS 変数を読めない描画先 (three.js の 3D 背景など) のためのテーマ色。
// 値は app/globals.css の .dark (既定テーマ) と揃える。トークンを変えたらここも直す (docs/design/theme.md)
export const sceneColors = {
  primary: "#3399ff", // --primary: 210 100% 60%
  secondary: "#2e2e38", // --secondary: 240 10% 20%
  accent: "#2e2e38", // --accent: 240 10% 20%
  gridCenter: "#20252f", // --muted-foreground (10%) を背景に重ねた色
  grid: "#191e28", // --muted-foreground (5%) を背景に重ねた色
} as const

// 導入演出のための色。演出は常に暗い地なので、ライト・ダークで同じ値になる。
// three.js は CSS 変数を読めないので、app/globals.css の --intro-* を 16 進で持つ
export const introColors = {
  backdrop: "#0e121b", // --intro-backdrop: 220 30% 8%
  violet: "#9b7bff", // --intro-violet: 254.5 100% 74.1%
  pink: "#ff6fb5", // --intro-pink: 330.8 100% 71.8%
  teal: "#45d4dc", // --intro-teal: 183.2 68.3% 56.7%
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
