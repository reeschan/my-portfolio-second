// CSS 変数を読めない描画先 (three.js の 3D 背景など) のためのテーマ色。
// 値は app/globals.css の .dark (既定テーマ) と揃える。トークンを変えたらここも直す (docs/design/theme.md)
export const sceneColors = {
  primary: "#3399ff", // --primary: 210 100% 60%
  secondary: "#2e2e38", // --secondary: 240 10% 20%
  accent: "#2e2e38", // --accent: 240 10% 20%
  gridCenter: "#20252f", // --muted-foreground (10%) を背景に重ねた色
  grid: "#191e28", // --muted-foreground (5%) を背景に重ねた色
} as const

// recharts など、色を文字列で受け取るライブラリに渡すトークン参照
export const chartColors = {
  primary: "hsl(var(--primary))",
  foreground: "hsl(var(--foreground))",
  grid: "hsl(var(--muted-foreground) / 0.5)",
} as const
