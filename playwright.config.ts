import { defineConfig, devices } from "@playwright/test"
import { nowPostToken } from "./e2e/fixtures"

const port = Number(process.env.E2E_PORT ?? 3100)
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`

// CI では本番ビルド (pnpm build 済み) を起動し、手元では dev サーバーで回す
const webServerCommand = process.env.CI ? `pnpm start --port ${port}` : `pnpm dev --port ${port}`

export default defineConfig({
  testDir: "./e2e",
  // 手元の dev サーバーは各ページを初めて開いたときにコンパイルするので、並列実行だと 30 秒を超えることがある。
  // CI は本番ビルドなので既定の 30 秒のまま
  timeout: process.env.CI ? 30_000 : 60_000,
  // 同じ理由で、ページを移った直後の表示を待つ expect も既定の 5 秒では足りないことがある (巡回・背景テーマなどで回ごとに揺れた)。
  // CI は既定の 5 秒のまま
  expect: { timeout: process.env.CI ? 5_000 : 15_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // testing/e2e-policy.yml の responsive 観点。@responsive タグ付きのテストだけをスマホ幅でも回す
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@responsive/ },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: webServerCommand,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        // E2E では本物の LLM を絶対に呼ばない (testing/e2e-policy.yml の external-mock 観点)
        // /now の投稿はプロセス内のメモリに保存し、本物の Redis に書かない (e2e/now.spec.ts)
        env: {
          MOONSHOT_API_KEY: "",
          // E2E から本物の Blob を読まない (チャットは /api/chat ごとモックしている)
          BLOB_READ_WRITE_TOKEN: "",
          BLOB_STORE_ID: "",
          NOW_POST_TOKEN: nowPostToken,
          NOW_POSTS_STORE: "memory",
          // E2E から本物の Slack に通知しない
          SLACK_WEBHOOK_URL: "",
          UPSTASH_REDIS_REST_URL: "",
          UPSTASH_REDIS_REST_TOKEN: "",
          KV_REST_API_URL: "",
          KV_REST_API_TOKEN: "",
        },
      },
})
