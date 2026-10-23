// @perspectives interaction
// @routes /
import { describe, expect, it } from "vitest"
import {
  INTRO_WAIT_LIMIT_MS,
  IntroEvent,
  IntroPhase,
  initialIntroProgress,
  introPhase,
  isHeadingShown,
  isIntroShown,
  reduceIntroProgress,
  type IntroProgress,
} from "@/lib/intro/handoff"

// 出来事を順に送ったあとの進み具合を作る
function run(events: IntroEvent[], backgroundReadyAtMount = false): IntroProgress {
  return events.reduce(reduceIntroProgress, initialIntroProgress(backgroundReadyAtMount))
}

describe("initialIntroProgress", () => {
  it("描いた時点で背景の準備ができていれば、導入演出を飛ばす", () => {
    expect(initialIntroProgress(true)).toEqual({
      skipped: true,
      introEnded: false,
      waitTimedOut: false,
      entranceClicked: false,
    })
  })

  it("背景の準備ができていなければ、どの進み具合も false", () => {
    expect(initialIntroProgress(false)).toEqual({
      skipped: false,
      introEnded: false,
      waitTimedOut: false,
      entranceClicked: false,
    })
  })
})

describe("reduceIntroProgress", () => {
  it.each([
    { event: IntroEvent.IntroEnded, flag: "introEnded" },
    { event: IntroEvent.WaitTimedOut, flag: "waitTimedOut" },
    { event: IntroEvent.EntranceClicked, flag: "entranceClicked" },
  ])("$event で $flag だけが true になる", ({ event, flag }) => {
    const progress = reduceIntroProgress(initialIntroProgress(false), event)
    expect(progress).toEqual({ ...initialIntroProgress(false), [flag]: true })
  })

  it("同じ出来事が何度来ても進み具合は変わらない", () => {
    const events = [IntroEvent.IntroEnded, IntroEvent.WaitTimedOut, IntroEvent.EntranceClicked]
    const once = events.reduce(reduceIntroProgress, initialIntroProgress(false))
    const twice = events.reduce(reduceIntroProgress, once)
    expect(twice).toEqual(once)
  })

  it("飛ばすかどうか (skipped) は出来事では変わらない", () => {
    const skipped = [IntroEvent.IntroEnded, IntroEvent.WaitTimedOut, IntroEvent.EntranceClicked].reduce(
      reduceIntroProgress,
      initialIntroProgress(true),
    )
    expect(skipped.skipped).toBe(true)
  })
})

// 進み具合と準備完了から状態が決まることを、1 行 1 ケースで確かめる
type PhaseCase = {
  name: string
  events?: IntroEvent[]
  skipped?: boolean
  backgroundReady: boolean
  expected: IntroPhase
}

const phaseCases: PhaseCase[] = [
  {
    name: "何も起きていなければ演出中",
    backgroundReady: false,
    expected: IntroPhase.Playing,
  },
  {
    name: "背景の準備が終わっていても、導入演出が終わるまでは演出中",
    backgroundReady: true,
    expected: IntroPhase.Playing,
  },
  {
    name: "導入演出が終わっても背景の準備ができていなければ背景待ち",
    events: [IntroEvent.IntroEnded],
    backgroundReady: false,
    expected: IntroPhase.WaitingBackground,
  },
  {
    name: "導入演出が終わって背景の準備もできていれば引き継ぎ済み",
    events: [IntroEvent.IntroEnded],
    backgroundReady: true,
    expected: IntroPhase.HandedOff,
  },
  {
    name: "待ち時間が来ても、導入演出が終わっていなければ演出中",
    events: [IntroEvent.WaitTimedOut],
    backgroundReady: false,
    expected: IntroPhase.Playing,
  },
  {
    name: "待ち時間を過ぎたらあきらめ",
    events: [IntroEvent.IntroEnded, IntroEvent.WaitTimedOut],
    backgroundReady: false,
    expected: IntroPhase.GaveUp,
  },
  {
    name: "あきらめたあとに準備完了になってもあきらめのまま",
    events: [IntroEvent.IntroEnded, IntroEvent.WaitTimedOut],
    backgroundReady: true,
    expected: IntroPhase.GaveUp,
  },
  {
    name: "演出中に入口が押されたら打ち切り",
    events: [IntroEvent.EntranceClicked],
    backgroundReady: false,
    expected: IntroPhase.Dismissed,
  },
  {
    name: "背景待ちに入口が押されたら打ち切り",
    events: [IntroEvent.IntroEnded, IntroEvent.EntranceClicked],
    backgroundReady: false,
    expected: IntroPhase.Dismissed,
  },
  {
    name: "引き継ぎ済みに入口が押されたら打ち切り",
    events: [IntroEvent.IntroEnded, IntroEvent.EntranceClicked],
    backgroundReady: true,
    expected: IntroPhase.Dismissed,
  },
  {
    name: "あきらめに入口が押されたら打ち切り",
    events: [IntroEvent.IntroEnded, IntroEvent.WaitTimedOut, IntroEvent.EntranceClicked],
    backgroundReady: true,
    expected: IntroPhase.Dismissed,
  },
  {
    name: "飛ばすなら引き継ぎ済み",
    skipped: true,
    backgroundReady: false,
    expected: IntroPhase.HandedOff,
  },
  {
    name: "飛ばすときでも入口が押されたら打ち切り",
    skipped: true,
    events: [IntroEvent.EntranceClicked],
    backgroundReady: false,
    expected: IntroPhase.Dismissed,
  },
]

describe("introPhase", () => {
  it.each(phaseCases)("$name", ({ events = [], skipped = false, backgroundReady, expected }) => {
    const progress = events.reduce(reduceIntroProgress, initialIntroProgress(skipped))
    expect(introPhase(progress, backgroundReady)).toBe(expected)
  })

  it("背景の準備完了は進み具合に持たないので、導入演出の終わりとの前後で結果は変わらない", () => {
    // 演出中に準備完了が届いても、進み具合はまだ空。導入演出が終わった時点で引き継ぎ済みになる
    const readyDuringIntro = initialIntroProgress(false)
    expect(introPhase(readyDuringIntro, true)).toBe(IntroPhase.Playing)
    expect(introPhase(reduceIntroProgress(readyDuringIntro, IntroEvent.IntroEnded), true)).toBe(IntroPhase.HandedOff)
  })

  it("導入演出の終わりと待ち時間切れは、どちらが先でもあきらめになる", () => {
    const readyLater = [
      [IntroEvent.IntroEnded, IntroEvent.WaitTimedOut],
      [IntroEvent.WaitTimedOut, IntroEvent.IntroEnded],
    ]
    for (const events of readyLater) {
      // 待ち時間切れのフラグが立っていれば、あとから準備完了になっても状態は変わらない
      expect(introPhase(run(events), false)).toBe(IntroPhase.GaveUp)
      expect(introPhase(run(events), true)).toBe(IntroPhase.GaveUp)
    }
  })

  it("入口が押されたら、出来事のどの順番でも打ち切りになる", () => {
    const orders: IntroEvent[][] = [
      [IntroEvent.IntroEnded, IntroEvent.WaitTimedOut, IntroEvent.EntranceClicked],
      [IntroEvent.IntroEnded, IntroEvent.EntranceClicked, IntroEvent.WaitTimedOut],
      [IntroEvent.WaitTimedOut, IntroEvent.IntroEnded, IntroEvent.EntranceClicked],
      [IntroEvent.WaitTimedOut, IntroEvent.EntranceClicked, IntroEvent.IntroEnded],
      [IntroEvent.EntranceClicked, IntroEvent.IntroEnded, IntroEvent.WaitTimedOut],
      [IntroEvent.EntranceClicked, IntroEvent.WaitTimedOut, IntroEvent.IntroEnded],
    ]
    for (const events of orders) {
      expect(introPhase(run(events), false)).toBe(IntroPhase.Dismissed)
      expect(introPhase(run(events), true)).toBe(IntroPhase.Dismissed)
    }
  })

  it("引き継ぎ済みとあきらめは、同じ出来事が繰り返されても変わらない", () => {
    const handedOff = run([IntroEvent.IntroEnded, IntroEvent.IntroEnded])
    expect(introPhase(handedOff, true)).toBe(IntroPhase.HandedOff)

    const gaveUp = run([IntroEvent.IntroEnded, IntroEvent.WaitTimedOut, IntroEvent.WaitTimedOut])
    expect(introPhase(gaveUp, false)).toBe(IntroPhase.GaveUp)
    expect(introPhase(gaveUp, true)).toBe(IntroPhase.GaveUp)
  })
})

describe("isIntroShown", () => {
  it.each([
    { phase: IntroPhase.Playing, expected: true },
    { phase: IntroPhase.WaitingBackground, expected: true },
    { phase: IntroPhase.HandedOff, expected: false },
    { phase: IntroPhase.GaveUp, expected: true },
    { phase: IntroPhase.Dismissed, expected: false },
  ])("$phase のときに $expected", ({ phase, expected }) => {
    expect(isIntroShown(phase)).toBe(expected)
  })
})

describe("isHeadingShown", () => {
  it.each([
    { phase: IntroPhase.Playing, expected: false },
    { phase: IntroPhase.WaitingBackground, expected: false },
    { phase: IntroPhase.HandedOff, expected: true },
    { phase: IntroPhase.GaveUp, expected: true },
    { phase: IntroPhase.Dismissed, expected: false },
  ])("$phase のときに $expected", ({ phase, expected }) => {
    expect(isHeadingShown(phase)).toBe(expected)
  })
})

describe("INTRO_WAIT_LIMIT_MS", () => {
  it("導入演出が終わってから待つ上限は 8 秒", () => {
    expect(INTRO_WAIT_LIMIT_MS).toBe(8000)
  })
})
