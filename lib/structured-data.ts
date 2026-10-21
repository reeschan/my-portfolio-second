import { ja } from "@/data/messages/ja"
import { profile, profileLinks } from "@/data/overview"
import { pageTitle, siteName, siteUrl } from "@/lib/metadata"

// サイト全体の構造化データ (docs/specs/seo-stage2.md、ADR 0033)。
// Person と WebSite はルートのレイアウトが全ページに 1 回だけ出し、ページごとの部分 (ProfilePage など) は
// この @id を指す。1 ページに同じ人物・同じサイトが何度も書かれないよう、組み立てはここ 1 か所に寄せる

// 人物とサイトの識別子。正のホスト (siteUrl) にフラグメントを付けて作る (直書きしない)
export const personId = new URL("#person", siteUrl).href
export const websiteId = new URL("#website", siteUrl).href

// layout.tsx が 1 つの script に出す @graph。値はすべて import した定数から作る
export function siteGraphJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: siteName,
        url: siteUrl.href,
        // 表示言語は Cookie で切り替わるが、クローラは Cookie を送らないので日本語に固定する (ADR 0026・0029)
        inLanguage: "ja",
        publisher: { "@id": personId },
      },
      {
        "@type": "Person",
        "@id": personId,
        // 表示データ (日本語) から取る。英語版は索引に載せないので、言語で人物の情報を変えない (docs/specs/seo-stage2.md)
        name: profile.name,
        jobTitle: profile.role,
        url: siteUrl.href,
        image: new URL(profile.avatar.src, siteUrl).href,
        // GitHub・LinkedIn を同じ人物として結び付ける。値はプロフィールの表示データと二重に持たない
        sameAs: profileLinks.map((link) => link.href),
      },
    ],
  }
}

// /overview がページの script として出す ProfilePage。主題 (mainEntity) は、レイアウトが出す Person を @id で指す。
// Person をここでもう一度書くと 1 ページに同じ人物が 2 人いることになるので、参照だけにする
export function profilePageJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    // 題名はタブの表示名から作る (文言を二重に持たない)。表示言語によらず同じ値にするのは Person と同じ扱い
    name: pageTitle(ja.nav.overview),
    url: new URL("/overview", siteUrl).href,
    mainEntity: { "@id": personId },
    inLanguage: "ja",
  }
}
