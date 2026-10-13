// Vercel Web Analytics を有効にするか (ADR 0027)。
// Vercel 以外 (手元の dev・CI の本番ビルド) で計測スクリプトを読むと、本番ビルドでは /_vercel/insights/script.js が 404 になり、
// dev では外部の va.vercel-scripts.com を読みに行く。E2E の console エラー検出と「テストから外部に出ない」方針に掛かるので、
// Vercel が実行時に入れる VERCEL=1 があるときだけ有効にする
export function isVercelAnalyticsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.VERCEL === "1"
}
