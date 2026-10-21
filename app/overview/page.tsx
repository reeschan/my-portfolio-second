import type { Metadata } from "next"
import Image from "next/image"
import { Section, TextLink } from "@/components/common"
import { PageTemplate } from "@/components/layout/page-template"
import { overviewByLocale } from "@/data/localized"
import { profileLinks } from "@/data/overview"
import { messagesOf } from "@/data/messages"
import { getLocale, getMessages } from "@/lib/i18n/server"
import { pageMetadata, pageTitle } from "@/lib/metadata"
import { navItems, type NavId } from "@/lib/navigation"
import { serializeJsonLd } from "@/lib/now/structured-data"
import { profilePageJsonLd } from "@/lib/structured-data"

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages()
  return pageMetadata({ title: pageTitle(messages.nav.overview), description: messages.overview.description, path: "/overview" })
}

export default async function OverviewPage() {
  const locale = await getLocale()
  const messages = messagesOf(locale)
  const { profile, pageGuides } = overviewByLocale[locale]
  // タブの表示名はナビゲーションの文言が正。案内の文言だけを data/overview.ts に持つ
  const guides = pageGuides.map((guide) => ({ ...guide, label: navLabelOf(guide.href, messages.nav) }))

  return (
    <PageTemplate title={messages.nav.overview}>
      <div className="space-y-10">
        <Section title={messages.overview.profile} size="lg">
          <div className="flex flex-wrap items-center gap-5">
            {/* 3D 背景の上でも縁が分かるよう、トークンの枠線で囲む */}
            <Image
              src={profile.avatar.src}
              alt={profile.avatar.alt}
              width={112}
              height={112}
              priority
              className="size-28 shrink-0 rounded-full border-2 border-primary/60 object-cover shadow-lg"
            />
            <p className="text-lg font-semibold">
              {profile.name}
              <span className="ml-3 text-base font-normal text-muted-foreground">{profile.role}</span>
            </p>
          </div>
          <div className="mt-4 space-y-3 leading-relaxed text-foreground/90">
            {profile.summary.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <ul aria-label={messages.overview.profileLinks} className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            {profileLinks.map((link) => (
              <li key={link.href}>
                <TextLink href={link.href}>{link.label}</TextLink>
              </li>
            ))}
          </ul>
        </Section>

        <Section title={messages.overview.guide}>
          <ul aria-label={messages.overview.guideList} className="space-y-4">
            {guides.map((guide) => (
              <li key={guide.href}>
                <TextLink href={guide.href} className="font-semibold">
                  {guide.label}
                </TextLink>
                <p className="mt-1 text-sm text-muted-foreground">{guide.description}</p>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      {/* 検索エンジンに、このページが持ち主のプロフィールだと伝える。Person はレイアウトの分を @id で指す (lib/structured-data.ts) */}
      {/* serializeJsonLd が < をエスケープ済み (lib/now/structured-data.ts、Next.js の JSON-LD のガイド) */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(profilePageJsonLd()) }} />
    </PageTemplate>
  )
}

function navLabelOf(href: string, labels: Record<NavId, string>): string {
  const item = navItems.find((nav) => nav.href === href)
  return item ? labels[item.id] : href
}
