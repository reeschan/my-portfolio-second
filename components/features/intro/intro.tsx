"use client"

import Image from "next/image"
import { useCallback, useEffect, useReducer, useRef, useSyncExternalStore, type MouseEvent, type ReactNode } from "react"
import { getBackgroundReady, getServerBackgroundReady, subscribeBackgroundReady } from "@/lib/background-load"
import { INTRO_WAIT_LIMIT_MS, IntroEvent, initialIntroProgress, introPhase, isHeadingShown, reduceIntroProgress } from "@/lib/intro/handoff"
import { cn } from "@/lib/utils"
import styles from "./intro.module.css"

// 名前は飾り。1 文字ずつ span に分けて、CSS のアニメーションを少しずつ遅らせる
const NAME = "RYUKI TOBITA"

type IntroProps = {
  heading: ReactNode
  entrance: ReactNode
  // 領域の名前 (読み込み中) を持つ要素の id。トップの殻は言語を読めないので、名前は言語の島が描いた
  // 隠れた要素から aria-labelledby で受け取る (ADR 0035)。この部品の中で Cookie は読まない
  labelId: string
}

// トップの導入演出。背景の層に 5 秒の演出を描き、背景の準備完了との引き継ぎを決める (docs/specs/intro-handoff.md)
export function Intro({ heading, entrance, labelId }: IntroProps) {
  // 描いた時点で背景の準備ができていれば、演出を流さずに済む (サイト内の移動で戻ったとき)
  const [progress, dispatch] = useReducer(reduceIntroProgress, getBackgroundReady(), initialIntroProgress)
  // 準備完了は、購読と取得の形のストアから受け取る。サーバーでは未完了として描き、最初の HTML と食い違わせない
  const backgroundReady = useSyncExternalStore(subscribeBackgroundReady, getBackgroundReady, getServerBackgroundReady)
  const phase = introPhase(progress, backgroundReady)
  const waitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clock = useRef<HTMLDivElement | null>(null)
  // 時計の終わりは animationend と finished の両方から届く。2 回目以降を捨てて、待ちの上限のタイマーを
  // 二重に始めないようにする (docs/specs/intro-handoff.md)
  const clockEnded = useRef(false)

  // 待ちの上限のタイマーを、部品が外れたときに残さない
  useEffect(() => {
    return () => {
      if (waitTimer.current !== null) clearTimeout(waitTimer.current)
    }
  }, [])

  const handleClockEnd = useCallback(() => {
    if (clockEnded.current) return
    clockEnded.current = true
    dispatch(IntroEvent.IntroEnded)
    // 演出の終わりと同じハンドラで、背景を待つ上限を始める。早く準備できたときは、時間が来ても何もしない
    if (waitTimer.current !== null) clearTimeout(waitTimer.current)
    waitTimer.current = setTimeout(() => {
      if (!getBackgroundReady()) dispatch(IntroEvent.WaitTimedOut)
    }, INTRO_WAIT_LIMIT_MS)
  }, [])

  // 時計はサーバーで描いた HTML の時点から CSS で動き出すので、ハイドレーションより先に終わると
  // animationend を取りこぼす。終わったアニメーションでも解決する finished を待って、その場合も拾う。
  // 解決はマイクロタスクのコールバックで受けるので、useEffect の本体で同期的に dispatch することはない
  useEffect(() => {
    const element = clock.current
    // getAnimations が無いブラウザでは animationend だけに任せる
    if (!element || typeof element.getAnimations !== "function") return
    // 時計の要素にはアニメーションが 1 つだけ付いている
    const animation = element.getAnimations()[0]
    if (!animation) return

    let cancelled = false
    animation.finished.then(
      () => {
        if (!cancelled) handleClockEnd()
      },
      () => {
        // アニメーションが取り消されたときは「終わった」ではない。未処理の reject も残さない
      },
    )

    // 部品が外れたあとに解決しても、状態を変えない
    return () => {
      cancelled = true
    }
  }, [handleClockEnd])

  // このページでの移動になるクリックだけを拾う。修飾キー付きや左ボタン以外は新しいタブで開くなどして
  // 元のタブは移らないので、演出を打ち切らない (docs/specs/intro-handoff.md)
  const handleEntranceClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.defaultPrevented) return
    // キーボードの Enter は detail が 0 で来るので、左ボタンと同じ扱いにする
    if (event.button !== 0 && event.detail !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    dispatch(IntroEvent.EntranceClicked)
  }

  return (
    <>
      <section className={cn(styles.intro, progress.skipped && styles.skipped)} data-intro-phase={phase} aria-labelledby={labelId}>
        {/* 飾りは読み上げない。読み込み中であることは aria-labelledby の先の要素が伝える */}
        <div className={cn(styles.blob, styles.blobA)} aria-hidden />
        <div className={cn(styles.blob, styles.blobB)} aria-hidden />
        <div className={cn(styles.blob, styles.blobC)} aria-hidden />
        <div className={cn(styles.blob, styles.blobD)} aria-hidden />
        <div className={styles.dust} aria-hidden />

        <div className={styles.composition} aria-hidden>
          <div className={styles.halo} />
          <div className={styles.shards}>
            {[0, 1, 2, 3, 4, 5].map((shard) => (
              <div key={shard} className={styles.shard} />
            ))}
          </div>

          <div className={styles.card}>
            <div className={styles.chara}>
              {/* 目を閉じた絵を最初に見せる。LCP を遅らせないよう、こちらを先に読み込む */}
              <Image className={styles.base} src="/intro/chara-open.webp" alt="" width={600} height={800} loading="eager" />
              <Image className={cn(styles.pose, styles.closed)} src="/intro/chara-closed.webp" alt="" width={600} height={800} preload />
              <Image className={cn(styles.ghost, styles.ghostPink)} src="/intro/chara-closed.webp" alt="" width={600} height={800} />
              <Image className={cn(styles.ghost, styles.ghostTeal)} src="/intro/chara-closed.webp" alt="" width={600} height={800} />
            </div>
          </div>

          {/* カードの縁からはみ出す頭。上半分だけを前面に重ねる */}
          <div className={styles.popout}>
            <div className={styles.chara}>
              <Image className={styles.base} src="/intro/chara-open.webp" alt="" width={600} height={800} loading="eager" />
              <Image className={cn(styles.pose, styles.closed)} src="/intro/chara-closed.webp" alt="" width={600} height={800} />
            </div>
          </div>

          <div className={styles.frontGlass} />

          <div className={styles.caption}>
            <div className={styles.name}>
              {Array.from(NAME).map((char, index) => (
                <span key={`${char}-${index}`} style={{ animationDelay: `${index * 40}ms` }}>
                  {char === " " ? "\u00A0" : char}
                </span>
              ))}
            </div>
            <div className={styles.meta}>
              <span>Portfolio</span>
              <span>·</span>
              <span>Loading</span>
            </div>
            <div className={styles.bar} />
          </div>
        </div>

        <div className={styles.flash} aria-hidden />
        {/* 演出と同じ長さの見えない時計。終わったことを React に知らせるためだけに置く */}
        <div ref={clock} className={styles.clock} aria-hidden onAnimationEnd={handleClockEnd} />
      </section>

      {/* 見出しは透明のあいだも読み上げと最初の HTML に残す。見せ方だけを opacity で変える */}
      <div className={cn(styles.heading, isHeadingShown(phase) && styles.headingShown)}>{heading}</div>

      {/* 入口は演出の最中でも押せる。押されたら演出を打ち切って本文へ移る */}
      <div className={styles.entrance} onClickCapture={handleEntranceClick}>
        {entrance}
      </div>
    </>
  )
}
