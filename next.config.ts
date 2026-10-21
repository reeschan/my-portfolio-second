import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // async にすると中身に await が無いと lint に怒られるので、同期の関数で返す (Next.js はどちらも受け付ける)
  headers() {
    return [
      {
        // すべての応答に付ける。headers はファイルシステムより先に当たるので、404 の応答にも付く
        source: "/:path*",
        headers: [
          {
            // ブラウザが Content-Type を無視してファイルの種類を推測すると、XSS に繋がるため推測させない
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            // 遷移先のサイトへリンク元の URL をそのまま渡さず、別サイトにはオリジンだけを渡す
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            // 他のサイトの iframe に埋め込ませない (クリックジャッキング対策)。CSP の本体は別途入れる
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'",
          },
        ],
      },
    ]
  },
}

export default nextConfig
