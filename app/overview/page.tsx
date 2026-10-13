import { Section, TextLink } from "@/components/common"
import { PageTemplate } from "@/components/layout/page-template"
import { overviewByLocale } from "@/data/localized"
import { profileLinks } from "@/data/overview"
import { messagesOf } from "@/data/messages"
import { getLocale } from "@/lib/i18n/server"
import { navItems, type NavId } from "@/lib/navigation"

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
          <p className="text-lg font-semibold">
            {profile.name}
            <span className="ml-3 text-base font-normal text-muted-foreground">{profile.role}</span>
          </p>
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
    </PageTemplate>
  )
}

function navLabelOf(href: string, labels: Record<NavId, string>): string {
  const item = navItems.find((nav) => nav.href === href)
  return item ? labels[item.id] : href
}
