import { Section, TextLink } from "@/components/common"
import { PageTemplate } from "@/components/layout/page-template"
import { pageGuides, profile, profileLinks } from "@/data/overview"
import { navItems } from "@/lib/navigation"

// タブの表示名はナビゲーションが正。案内の文言だけを data/overview.ts に持つ
const guides = pageGuides.map((guide) => ({
  ...guide,
  label: navItems.find((item) => item.href === guide.href)?.label ?? guide.href,
}))

export default function OverviewPage() {
  return (
    <PageTemplate title="概要">
      <div className="space-y-10">
        <Section title="プロフィール" size="lg">
          <p className="text-lg font-semibold">
            {profile.name}
            <span className="ml-3 text-base font-normal text-muted-foreground">{profile.role}</span>
          </p>
          <div className="mt-4 space-y-3 leading-relaxed text-foreground/90">
            {profile.summary.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <ul aria-label="外部のプロフィール" className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            {profileLinks.map((link) => (
              <li key={link.href}>
                <TextLink href={link.href}>{link.label}</TextLink>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="このサイトの歩き方">
          <ul aria-label="各ページの案内" className="space-y-4">
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
