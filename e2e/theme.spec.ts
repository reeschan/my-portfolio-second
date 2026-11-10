import type { Locator } from "@playwright/test"
import { careerData } from "../data/career"
import { overviewByLocale } from "../data/localized"
import { ja } from "../data/messages/ja"
import { works } from "../data/works"
import { displayHost } from "../lib/metadata"
import { createNowPost, expect, pages, routes, test, uniqueTitle } from "./fixtures"

// testing/e2e-policy.yml の theme 観点。テーマの正本は app/globals.css (docs/design/theme.md)
// 見た目のピクセル比較はしない。「既定テーマが当たっている」「トークンが定義され、画面がトークン経由で塗られている」を確かめる

// globals.css で定義しているトークン。消したり名前を変えたりしたらここで気づけるようにする
const requiredTokens = [
  "--background",
  "--foreground",
  "--card",
  "--primary",
  "--muted-foreground",
  "--border",
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--rss",
  "--radius",
]

// 先頭の項目をデータの並び順から取る。無ければ「見つからない」で落ちるより、データの欠けとして気づけるようにする
function firstOf<T>(items: readonly T[], what: string): T {
  const value = items[0]
  if (value === undefined) throw new Error(`${what} の先頭の項目が無い`)
  return value
}

const firstWork = firstOf(works, "data/works.ts")
const firstTech = firstOf(firstWork.tech, `${firstWork.title} の技術`)
const firstCareer = firstOf(careerData, "data/career.ts")

test.describe("テーマ", () => {
  // OS がライトモードでも、サイトの既定はダークテーマ (layout.tsx の defaultTheme="dark")
  test.use({ colorScheme: "light" })

  for (const p of pages) {
    test(
      `${p.path} はダークテーマで表示され、背景色がトークンから決まる`,
      { tag: "@theme", annotation: routes(p.path) },
      async ({ page }) => {
        await page.goto(p.path)
        await expect(page.locator("html")).toHaveClass(/\bdark\b/)

        const result = await page.evaluate((tokens) => {
          const rootStyle = getComputedStyle(document.documentElement)
          const missing = tokens.filter((t) => rootStyle.getPropertyValue(t).trim() === "")
          // トークンで塗った見本の要素と body の背景色が一致するか (生の色を直書きしていないか)
          const probe = document.createElement("div")
          probe.style.backgroundColor = "hsl(var(--background))"
          document.body.appendChild(probe)
          const expected = getComputedStyle(probe).backgroundColor
          probe.remove()
          return { missing, expected, actual: getComputedStyle(document.body).backgroundColor }
        }, requiredTokens)

        expect(result.missing, "未定義のテーマトークン").toEqual([])
        expect(result.actual).toBe(result.expected)
      },
    )
  }

  test(
    "本文パネルはガラス調 (半透明 + 背景ぼかし) で、3D 背景が透けて見える",
    { tag: "@theme", annotation: routes("/") },
    async ({ page }) => {
      await page.goto("/")
      // 見出しの直後にある本文パネル。CSS クラスではなく、見出しとの位置関係で取る
      const panel = page.getByRole("main").getByRole("heading", { level: 1 }).locator("xpath=following-sibling::div[1]")
      const style = await panel.evaluate((el) => {
        const s = getComputedStyle(el)
        return { backdrop: s.backdropFilter, background: s.backgroundColor }
      })
      // 本文パネルは面が大きく描き直しが重いので、帯より弱いぼかし (--blur-glass-panel) にしている
      expect(style.backdrop).toBe("blur(6px)")
      // 半透明 (アルファ付き) であること
      expect(style.background).toMatch(/rgba?\(.+[,/]\s*0?\.\d+\)|color\(.+\/\s*0?\.\d+\)/)

      // タブバー (glass-bar は nav 自身に付いている) は従来どおりのぼかし (--blur-glass) のまま
      const tabBar = page.getByRole("navigation", { name: ja.layout.pages })
      const tabBarBackdrop = await tabBar.evaluate((el) => getComputedStyle(el).backdropFilter)
      expect(tabBarBackdrop).toBe("blur(12px)")
    },
  )

  // ホバーの transition が終わるまで待つ。poll の 1 回目は transition が動き出す前に読まれてしまい、
  // 浮き上がりに戻しても一致して終わるため (固定の待ち時間は使わない)
  const waitForTransitions = async (locator: Locator) => {
    await locator.evaluate(async (el) => {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      await Promise.all(el.getAnimations({ subtree: true }).map((animation) => animation.finished))
    })
  }

  // 押せるカードはホバーで色と面だけを変える。浮き上がると読む前に視線が動くため (unslop の Motion)
  test("ワークのカードはホバーで浮かない", { tag: ["@theme", "@interaction"], annotation: routes("/works") }, async ({ page }) => {
    await page.goto("/works")
    const button = page.getByRole("button", { name: firstWork.title })
    const card = page.getByRole("article").filter({ has: button })
    await expect(card).toBeVisible()

    const before = await card.boundingBox()
    if (!before) throw new Error("作品のカードの位置が取れない")
    await button.hover()

    await waitForTransitions(card)
    const after = await card.boundingBox()
    if (!after) throw new Error("作品のカードの位置が取れない")
    expect(after.y).toBe(before.y)
  })

  test(
    "Now の記事のカードはホバーで浮かない",
    { tag: ["@theme", "@interaction"], annotation: routes("/now") },
    async ({ page, request }) => {
      // 記事は並列のテストが同じサーバーに投稿するので、題名を一意にして自分の記事だけを見る
      const title = uniqueTitle("浮かないカード")
      await createNowPost(request, { title, body: "本文" })

      await page.goto("/now")
      const card = page.getByRole("article").filter({ has: page.getByRole("link", { name: title }) })
      await expect(card).toBeVisible()

      const before = await card.boundingBox()
      if (!before) throw new Error("記事のカードの位置が取れない")
      await card.getByRole("link", { name: title }).hover()

      await waitForTransitions(card)
      const after = await card.boundingBox()
      if (!after) throw new Error("記事のカードの位置が取れない")
      expect(after.y).toBe(before.y)
    },
  )

  test("Now の記事の日付は等幅で、本文の書体と異なる", { tag: "@theme", annotation: routes("/now") }, async ({ page, request }) => {
    const title = uniqueTitle("日付の書体")
    await createNowPost(request, { title, body: "本文" })

    await page.goto("/now")
    const card = page.getByRole("article").filter({ has: page.getByRole("link", { name: title }) })
    const time = card.locator("time")
    await expect(time).toBeVisible()

    const fonts = await time.evaluate((el) => ({
      time: getComputedStyle(el).fontFamily,
      body: getComputedStyle(document.body).fontFamily,
    }))
    // 日付は数字の幅をそろえたいので Geist Mono。本文の Geist とは別の family になる
    expect(fonts.time).toContain("Geist Mono")
    expect(fonts.time).not.toBe(fonts.body)
  })

  // 見出しの太さは 600 まで。tracking-tight は 40px 以上の大きな文字だけなので、h1 (text-4xl) は字間を詰めない
  for (const p of pages) {
    test(`${p.path} の h1 は太すぎず、字間を詰めない`, { tag: "@theme", annotation: routes(p.path) }, async ({ page }) => {
      await page.goto(p.path)
      const style = await page
        .getByRole("main")
        .getByRole("heading", { level: 1 })
        .evaluate((el) => {
          const s = getComputedStyle(el)
          return { fontWeight: s.fontWeight, letterSpacing: s.letterSpacing }
        })
      expect(Number(style.fontWeight)).toBeLessThanOrEqual(600)
      // normal の場合は数にできないので、normal か 0 以上の px だけを通す (詰めた値は負になる)
      expect(style.letterSpacing === "normal" || Number.parseFloat(style.letterSpacing) >= 0).toBe(true)
    })
  }

  test("経歴のカードに太い上線と影が無い", { tag: "@theme", annotation: routes("/career") }, async ({ page }) => {
    await page.goto("/career")
    const heading = page.getByRole("heading", { level: 2, name: firstCareer.title })
    await expect(heading).toBeVisible()

    // 見出しの親がカード (TimelineCard)。ダークの面では影で奥行きを出さず、面の明るさと細い線で見せる
    const style = await heading.locator("..").evaluate((el) => {
      const s = getComputedStyle(el)
      return { borderTopWidth: s.borderTopWidth, boxShadow: s.boxShadow }
    })
    expect(style.borderTopWidth).not.toBe("4px")
    expect(style.boxShadow).toBe("none")
  })

  test("経歴の期間とワークの技術のタグは等幅", { tag: "@theme", annotation: routes("/career", "/works") }, async ({ page }) => {
    await page.goto("/career")
    const period = page.locator("time").first()
    await expect(period).toBeVisible()
    const periodFont = await period.evaluate((el) => getComputedStyle(el).fontFamily)
    expect(periodFont).toContain("Geist Mono")

    await page.goto("/works")
    const article = page.getByRole("article").filter({ has: page.getByRole("button", { name: firstWork.title }) })
    const tag = article.getByText(firstTech, { exact: true })
    await expect(tag).toBeVisible()
    const tagFont = await tag.evaluate((el) => getComputedStyle(el).fontFamily)
    expect(tagFont).toContain("Geist Mono")
  })

  test("アドレスバーの URL は等幅", { tag: "@theme", annotation: routes("/", "/works") }, async ({ page }) => {
    // URL は打ち間違いを見比べる文字なので、本文の Geist ではなく Geist Mono で出す。
    // / と /works の 2 ページで足りる (帯はレイアウト共通)
    for (const path of ["/", "/works"]) {
      await page.goto(path)
      const address = page.getByText(displayHost + path, { exact: true })
      await expect(address).toBeVisible()
      const font = await address.evaluate((el) => getComputedStyle(el).fontFamily)
      expect(font).toContain("Geist Mono")
    }
  })

  test("本文の書体は Geist (等幅ではない)", { tag: "@theme", annotation: routes("/") }, async ({ page }) => {
    await page.goto("/")
    const body = await page.evaluate(() => getComputedStyle(document.body).fontFamily)
    // next/font は "Geist, Geist Fallback" のように名前を付ける。前方一致で比べず、最初の family を名指しで確かめる
    const [firstFamily = ""] = body.split(",")
    const first = firstFamily.trim()
    expect(first).toContain("Geist")
    expect(first).not.toContain("Mono")
  })

  test("アバターに影が無く、資格の囲みが青で塗られていない", { tag: "@theme", annotation: routes("/", "/skills") }, async ({ page }) => {
    await page.goto("/")
    const avatar = page.getByRole("img", { name: overviewByLocale.ja.profile.avatar.alt })
    await expect(avatar).toBeVisible()
    expect(await avatar.evaluate((el) => getComputedStyle(el).boxShadow)).toBe("none")

    await page.goto("/skills")
    const certTitle = page.getByRole("heading", { name: ja.skills.certifications })
    await expect(certTitle).toBeVisible()
    // 資格の囲み (Callout) が primary で塗られていないことを、トークンで塗った見本と比べる (生の色は書かない)。
    // 薄く敷いた面 (bg-primary/5) も見逃さないよう、実際の面と同じアルファ値の primary と比べる
    const colors = await certTitle.locator("..").evaluate((el) => {
      const actual = getComputedStyle(el).backgroundColor
      const probe = document.createElement("div")
      // アルファ値は rgba(..., a)・oklab(... / a)・color(... / a) のどれでも来るので、"/" 以降か 4 番目の値から取る
      const slash = actual.lastIndexOf("/")
      const parts = actual.replace(/^(?:rgba?|color)\(|\)$/g, "").split(/[,\s]+/)
      const alpha = slash >= 0 ? Number.parseFloat(actual.slice(slash + 1)) : parts.length === 4 ? Number.parseFloat(parts[3] ?? "") : 1
      // 透明な面は primary で塗られていないので、見本と比べるまでもない
      if (!Number.isFinite(alpha) || alpha === 0) return { actual, primary: null }
      probe.style.backgroundColor = `color-mix(in oklab, hsl(var(--primary)) calc(${alpha} * 100%), transparent)`
      document.body.appendChild(probe)
      const primary = getComputedStyle(probe).backgroundColor
      probe.remove()
      return { actual, primary }
    })
    if (colors.primary !== null) expect(colors.actual).not.toBe(colors.primary)
  })
})
