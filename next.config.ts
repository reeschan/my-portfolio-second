import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // チャット API が実行時に読み込む職務経歴書をデプロイに含める
  outputFileTracingIncludes: {
    "/api/chat": ["./data/resume.md"],
  },
};

export default nextConfig;
