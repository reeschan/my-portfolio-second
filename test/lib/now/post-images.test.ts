// @perspectives api-contract
// @routes /api/now
import { createHash } from "node:crypto"
import { describe, expect, it } from "vitest"
import { ImageContentType } from "@/lib/now/image-inspect"
import {
  darkPairName,
  imageLookup,
  imageRefsOf,
  maxImageBytes,
  maxImagesPerPost,
  planPostImages,
  PostImageIssueCode,
} from "@/lib/now/post-images"
import { type NowPostImage, nowPostSchema } from "@/lib/now/schema"

const encoder = new TextEncoder()

function svg(width: number, height: number, note = ""): Uint8Array {
  return encoder.encode(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><!--${note}--></svg>`)
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex")
}

function stored(name: string, bytes: Uint8Array = svg(10, 10, name)): NowPostImage {
  return {
    name,
    url: `https://blob.example/now/p/${name}`,
    width: 10,
    height: 10,
    contentType: ImageContentType.svg,
    bytes: bytes.length,
    sha256: sha256(bytes),
  }
}

function issueCodes(plan: ReturnType<typeof planPostImages>): [string, string | undefined][] {
  if (plan.ok) throw new Error("ok:false を期待しました")
  return plan.issues.map((issue) => [issue.code, issue.name])
}

function okPlan(plan: ReturnType<typeof planPostImages>) {
  if (!plan.ok) throw new Error(`ok:true を期待しました: ${JSON.stringify(plan.issues)}`)
  return plan
}

describe("imageRefsOf", () => {
  it("インライン・題つき・参照形式の画像を出てきた順に拾う", () => {
    const body = ["![a](assets/x.svg)", '![b](y.svg "題")', "![c][r]", "", "[r]: assets/z.svg"].join("\n")
    expect(imageRefsOf(body)).toEqual([
      { src: "assets/x.svg", alt: "a" },
      { src: "y.svg", alt: "b" },
      { src: "assets/z.svg", alt: "c" },
    ])
  })

  it("コードブロックとインラインコードの中は拾わない", () => {
    const body = ["```md", "![a](in-fence.svg)", "```", "", "`![b](inline.svg)`", "", "    ![c](indented.svg)", "", "![d](real.svg)"].join(
      "\n",
    )
    expect(imageRefsOf(body)).toEqual([{ src: "real.svg", alt: "d" }])
  })

  it("GFM の表の中の画像も拾う", () => {
    const body = ["| 図 | 説明 |", "| --- | --- |", "| ![a](assets/t.svg) | 表の中 |"].join("\n")
    expect(imageRefsOf(body)).toEqual([{ src: "assets/t.svg", alt: "a" }])
  })
})

describe("darkPairName", () => {
  it("拡張子の直前の -light を -dark にする", () => {
    expect(darkPairName("x-light.svg")).toBe("x-dark.svg")
    expect(darkPairName("a.b-light.png")).toBe("a.b-dark.png")
  })

  it("-light で終わらなければ null", () => {
    expect(darkPairName("x.svg")).toBeNull()
    expect(darkPairName("x-dark.svg")).toBeNull()
    expect(darkPairName("x-light")).toBeNull()
    expect(darkPairName("x-lights.svg")).toBeNull()
  })
})

describe("imageLookup", () => {
  const light = stored("x-light.svg")
  const dark = stored("x-dark.svg")
  const single = stored("y-light.svg")
  const lookup = imageLookup([light, dark, single])

  it("組があれば light と dark を返す", () => {
    expect(lookup("assets/x-light.svg")).toEqual({ light, dark })
  })

  it("組が無ければ light だけ", () => {
    expect(lookup("../y-light.svg")).toEqual({ light: single })
    expect(lookup("./x-dark.svg")).toEqual({ light: dark })
  })

  it("表に無い名前と外部の参照は null", () => {
    expect(lookup("assets/z.svg")).toBeNull()
    expect(lookup("https://example.com/x-light.svg")).toBeNull()
    expect(lookup("/x-light.svg")).toBeNull()
  })
})

describe("planPostImages の拒否", () => {
  it("本文の画像に対応するファイルが無ければ missing", () => {
    const plan = planPostImages({ body: "![a](assets/x.svg)", uploads: [], previous: [] })
    expect(issueCodes(plan)).toEqual([[PostImageIssueCode.missing, "x.svg"]])
  })

  it("previous にあれば missing にしない", () => {
    expect(planPostImages({ body: "![a](assets/x.svg)", uploads: [], previous: [stored("x.svg")] }).ok).toBe(true)
  })

  it("同じファイル名が 2 つなら duplicate", () => {
    const plan = planPostImages({
      body: "![a](x.svg)",
      uploads: [
        { name: "x.svg", bytes: svg(1, 1) },
        { name: "x.svg", bytes: svg(2, 2) },
      ],
      previous: [],
    })
    expect(issueCodes(plan)).toEqual([[PostImageIssueCode.duplicate, "x.svg"]])
  })

  it("使われていないファイルは unused。使われている -light と組になる -dark は使われているとみなす", () => {
    const plan = planPostImages({
      body: "![a](assets/x-light.svg)",
      uploads: [
        { name: "x-light.svg", bytes: svg(1, 1) },
        { name: "x-dark.svg", bytes: svg(1, 1) },
        { name: "y-dark.svg", bytes: svg(1, 1) },
        { name: "z.svg", bytes: svg(1, 1) },
      ],
      previous: [],
    })
    expect(issueCodes(plan)).toEqual([
      [PostImageIssueCode.unused, "y-dark.svg"],
      [PostImageIssueCode.unused, "z.svg"],
    ])
  })

  it.each([
    "http://example.com/a.svg",
    "https://example.com/a.svg",
    "//example.com/a.svg",
    "/a.svg",
    "data:image/png;base64,AAAA",
    "javascript:alert(1)",
  ])("外部の画像 %s は external", (src) => {
    const plan = planPostImages({ body: `![a](<${src}>)`, uploads: [], previous: [] })
    expect(issueCodes(plan).map(([code]) => code)).toEqual([PostImageIssueCode.external])
  })

  it("代替テキストが空か空白だけなら alt", () => {
    const plan = planPostImages({
      body: "![](x.svg)\n\n![ ](y.svg)",
      uploads: [
        { name: "x.svg", bytes: svg(1, 1) },
        { name: "y.svg", bytes: svg(1, 1) },
      ],
      previous: [],
    })
    expect(issueCodes(plan)).toEqual([
      [PostImageIssueCode.alt, "x.svg"],
      [PostImageIssueCode.alt, "y.svg"],
    ])
  })

  it("ファイル名が英数字・-・_・. だけでなければ name", () => {
    const plan = planPostImages({
      body: "![a](x.svg)",
      uploads: [
        { name: "x.svg", bytes: svg(1, 1) },
        { name: "図 1.svg", bytes: svg(1, 1) },
      ],
      previous: [],
    })
    expect(issueCodes(plan)).toContainEqual([PostImageIssueCode.name, "図 1.svg"])
  })

  it("inspectImage が断れば invalid で、理由を message に入れる", () => {
    const plan = planPostImages({
      body: "![a](x.svg)",
      uploads: [{ name: "x.svg", bytes: encoder.encode('<svg width="1" height="1"><script>alert(1)</script></svg>') }],
      previous: [],
    })
    expect(plan.ok).toBe(false)
    if (plan.ok) return
    expect(plan.issues).toHaveLength(1)
    expect(plan.issues[0]).toMatchObject({ code: PostImageIssueCode.invalid, name: "x.svg" })
    expect(plan.issues[0]?.message).toContain("<script>")
  })

  it("1 枚が maxImageBytes を超えれば too-large", () => {
    const big = svg(1, 1, "x".repeat(maxImageBytes))
    const plan = planPostImages({ body: "![a](x.svg)", uploads: [{ name: "x.svg", bytes: big }], previous: [] })
    expect(issueCodes(plan)).toEqual([[PostImageIssueCode.tooLarge, "x.svg"]])
  })

  it("ファイルが maxImagesPerPost を超えれば too-many", () => {
    const count = maxImagesPerPost + 1
    const names = Array.from({ length: count }, (_, i) => `i${i}.svg`)
    const body = names.map((name) => `![a](${name})`).join("\n\n")
    const plan = planPostImages({ body, uploads: names.map((name) => ({ name, bytes: svg(1, 1) })), previous: [] })
    expect(issueCodes(plan)).toEqual([[PostImageIssueCode.tooMany, undefined]])
  })

  it("複数の問題はまとめて返す", () => {
    const plan = planPostImages({
      body: "![](https://example.com/a.png)\n\n![b](missing.svg)",
      uploads: [{ name: "extra.svg", bytes: svg(1, 1) }],
      previous: [],
    })
    expect(
      issueCodes(plan)
        .map(([code]) => code)
        .sort(),
    ).toEqual([PostImageIssueCode.alt, PostImageIssueCode.external, PostImageIssueCode.missing, PostImageIssueCode.unused].sort())
  })
})

describe("planPostImages の成功", () => {
  it("新規の投稿では puts に sha256・contentType・幅・高さが入る", () => {
    const bytes = svg(30, 40)
    const plan = okPlan(planPostImages({ body: "![a](assets/x.svg)", uploads: [{ name: "x.svg", bytes }], previous: [] }))
    expect(plan.puts).toEqual([{ name: "x.svg", bytes, sha256: sha256(bytes), contentType: ImageContentType.svg, width: 30, height: 40 }])
    expect(plan.puts[0]?.sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(plan.kept).toEqual([])
    expect(plan.removed).toEqual([])
  })

  it("組の -dark も puts に入る", () => {
    const plan = okPlan(
      planPostImages({
        body: "![a](assets/x-light.svg)",
        uploads: [
          { name: "x-light.svg", bytes: svg(1, 1) },
          { name: "x-dark.svg", bytes: svg(1, 1) },
        ],
        previous: [],
      }),
    )
    expect(plan.puts.map((put) => put.name)).toEqual(["x-light.svg", "x-dark.svg"])
  })

  it("previous にある名前で今回送らなかったものは kept", () => {
    const x = stored("x.svg")
    const plan = okPlan(planPostImages({ body: "![a](x.svg)", uploads: [], previous: [x] }))
    expect(plan).toEqual({ ok: true, puts: [], kept: [x], removed: [] })
  })

  it("previous の -light で、今回 -dark だけを送れば組として puts に入る", () => {
    const light = stored("x-light.svg")
    const plan = okPlan(
      planPostImages({ body: "![a](x-light.svg)", uploads: [{ name: "x-dark.svg", bytes: svg(1, 1) }], previous: [light] }),
    )
    expect(plan.puts.map((put) => put.name)).toEqual(["x-dark.svg"])
    expect(plan.kept).toEqual([light])
  })

  it("今回送った名前が previous にもあれば puts に入り、previous の方は removed", () => {
    const old = stored("x.svg", svg(10, 10, "old"))
    const bytes = svg(20, 20, "new")
    const plan = okPlan(planPostImages({ body: "![a](x.svg)", uploads: [{ name: "x.svg", bytes }], previous: [old] }))
    expect(plan.puts.map((put) => put.sha256)).toEqual([sha256(bytes)])
    expect(plan.kept).toEqual([])
    expect(plan.removed).toEqual([old])
  })

  it("sha256 が同じなら put せず kept", () => {
    const bytes = svg(10, 10, "same")
    const old = stored("x.svg", bytes)
    const plan = okPlan(planPostImages({ body: "![a](x.svg)", uploads: [{ name: "x.svg", bytes }], previous: [old] }))
    expect(plan).toEqual({ ok: true, puts: [], kept: [old], removed: [] })
  })

  it("新しい本文が参照しなくなった previous の画像は removed", () => {
    const x = stored("x.svg")
    const y = stored("y.svg")
    const plan = okPlan(planPostImages({ body: "![a](x.svg)", uploads: [], previous: [x, y] }))
    expect(plan).toEqual({ ok: true, puts: [], kept: [x], removed: [y] })
  })

  it("本文が -dark を直接書いたら 1 枚として扱う", () => {
    const plan = okPlan(
      planPostImages({ body: "![a](x-dark.svg)", uploads: [{ name: "x-dark.svg", bytes: svg(1, 1) }], previous: [stored("x-light.svg")] }),
    )
    expect(plan.puts.map((put) => put.name)).toEqual(["x-dark.svg"])
    expect(plan.removed.map((image) => image.name)).toEqual(["x-light.svg"])
  })

  it("画像の無い本文と空の uploads は全部空", () => {
    expect(planPostImages({ body: "画像の無い本文", uploads: [], previous: [] })).toEqual({ ok: true, puts: [], kept: [], removed: [] })
  })
})

describe("参照の照合", () => {
  it("ファイル名 (最後の / より後ろ。./ や ../ も同じ) で照合する", () => {
    const body = "![a](./x.svg)\n\n![b](../img/y.svg)\n\n![c](a/b/c/z.svg)"
    const plan = okPlan(
      planPostImages({
        body,
        uploads: ["x.svg", "y.svg", "z.svg"].map((name) => ({ name, bytes: svg(1, 1) })),
        previous: [],
      }),
    )
    expect(plan.puts.map((put) => put.name)).toEqual(["x.svg", "y.svg", "z.svg"])
  })

  it("URL エンコードは decode してから比べる", () => {
    const plan = okPlan(
      planPostImages({ body: "![a](assets/my%2Dimage%5F1.svg)", uploads: [{ name: "my-image_1.svg", bytes: svg(1, 1) }], previous: [] }),
    )
    expect(plan.puts.map((put) => put.name)).toEqual(["my-image_1.svg"])
    expect(imageLookup([stored("my-image_1.svg")])("assets/my%2Dimage%5F1.svg")?.light.name).toBe("my-image_1.svg")
  })

  it("decode して許されない文字になれば name", () => {
    const plan = planPostImages({ body: "![a](assets/my%20image.svg)", uploads: [], previous: [] })
    expect(issueCodes(plan)).toEqual([[PostImageIssueCode.name, "my image.svg"]])
  })
})

describe("nowPostSchema の images", () => {
  const base = { id: "a", title: "題", body: "本文", publishedAt: "2026-10-21T00:00:00.000Z" }

  it("images の無い既存の記事も、images のある記事も読める", () => {
    expect(nowPostSchema.safeParse(base).success).toBe(true)
    const withImages = { ...base, images: [stored("x-light.svg"), stored("x-dark.svg")] }
    expect(nowPostSchema.parse(withImages)).toEqual(withImages)
  })

  it("壊れた対応表は読まない", () => {
    expect(nowPostSchema.safeParse({ ...base, images: [{ ...stored("x.svg"), width: 0 }] }).success).toBe(false)
    expect(nowPostSchema.safeParse({ ...base, images: [{ ...stored("x.svg"), sha256: "abc" }] }).success).toBe(false)
  })
})
