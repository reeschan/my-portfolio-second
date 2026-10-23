// 導入演出から 3D 背景への引き継ぎの判断 (docs/specs/intro-handoff.md)。
// React から切り離した純粋な関数にして、出来事の順番の組み合わせをテストで守れるようにしている
export const IntroPhase = {
  Playing: "playing",
  WaitingBackground: "waiting-background",
  HandedOff: "handed-off",
  GaveUp: "gave-up",
  Dismissed: "dismissed",
} as const
export type IntroPhase = (typeof IntroPhase)[keyof typeof IntroPhase]

export const IntroEvent = {
  IntroEnded: "intro-ended",
  WaitTimedOut: "wait-timed-out",
  EntranceClicked: "entrance-clicked",
} as const
export type IntroEvent = (typeof IntroEvent)[keyof typeof IntroEvent]

// 部品が持つ進み具合。背景の準備完了はストアから毎回もらうので、ここには持たない
export type IntroProgress = {
  skipped: boolean
  introEnded: boolean
  waitTimedOut: boolean
  entranceClicked: boolean
}

// 導入演出が終わってから、背景の準備完了を待つ上限 (ミリ秒)
export const INTRO_WAIT_LIMIT_MS = 8000

// 描いた時点で背景の準備ができていれば (サイト内の移動で戻ったとき) 導入演出を流さない。
// それ以外は、どの出来事もまだ起きていない状態から始める
export function initialIntroProgress(backgroundReadyAtMount: boolean): IntroProgress {
  return {
    skipped: backgroundReadyAtMount,
    introEnded: false,
    waitTimedOut: false,
    entranceClicked: false,
  }
}

// 出来事に対応するフラグを立てるだけ。同じ出来事が何度来ても結果は変わらず、skipped も変えない
export function reduceIntroProgress(progress: IntroProgress, event: IntroEvent): IntroProgress {
  switch (event) {
    case IntroEvent.IntroEnded:
      return { ...progress, introEnded: true }
    case IntroEvent.WaitTimedOut:
      return { ...progress, waitTimedOut: true }
    case IntroEvent.EntranceClicked:
      return { ...progress, entranceClicked: true }
  }
}

// 上から順に当てはめる。あとから準備完了になっても、あきらめた状態は覆さない
export function introPhase(progress: IntroProgress, backgroundReady: boolean): IntroPhase {
  if (progress.entranceClicked) return IntroPhase.Dismissed
  if (progress.skipped) return IntroPhase.HandedOff
  if (!progress.introEnded) return IntroPhase.Playing
  if (progress.waitTimedOut) return IntroPhase.GaveUp
  if (backgroundReady) return IntroPhase.HandedOff
  return IntroPhase.WaitingBackground
}

// 導入演出を出したままにするか。あきらめでは、演出の最後の姿を背景として残す
export function isIntroShown(phase: IntroPhase): boolean {
  return phase === IntroPhase.Playing || phase === IntroPhase.WaitingBackground || phase === IntroPhase.GaveUp
}

// 見出しを出すか。背景を受け取るか、待つのをあきらめたら、何のサイトかを示す
export function isHeadingShown(phase: IntroPhase): boolean {
  return phase === IntroPhase.HandedOff || phase === IntroPhase.GaveUp
}
