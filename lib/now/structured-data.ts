import { authorName, siteUrl } from "@/lib/metadata"
import { excerptOf } from "@/lib/now/excerpt"
import type { NowPost } from "@/lib/now/schema"

// 記事ページ (ADR 0030) が検索エンジンに渡す説明文の長さ。ページの metadata ・JSON-LD のどちらでも同じ長さにしたいので 1 か所で決める
// (excerptOf を直に呼ぶ各所で数字が揺れないようにする)
export const postDescriptionLength = 120

// RSS・OGP と同じ抜粋の作り方で Article の description を作る
export function blogPostingJsonLd({ post, url }: { post: NowPost; url: string }): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: excerptOf(post.body, postDescriptionLength),
    datePublished: post.publishedAt,
    // 一度も更新していない記事は updated が無い。JSON-LD は dateModified を必須にしていないので、空にする代わりに公開日で埋める
    dateModified: post.updatedAt ?? post.publishedAt,
    author: { "@type": "Person", name: authorName, url: siteUrl.href },
    url,
    mainEntityOfPage: url,
    inLanguage: "ja",
  }
}

// JSON.stringify は XSS の挿入を無害化しない。`<` を Unicode エスケープに置き換えて、
// 題名に `</script>` が入っても script タグを閉じられないようにする (Next.js docs: node_modules/next/dist/docs/01-app/02-guides/json-ld.md)
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}
