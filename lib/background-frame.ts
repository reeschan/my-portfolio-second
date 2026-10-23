// 3D 背景の描画の間引きと解像度の決まり。背景は動きがゆるやかなので、30fps でも見た目はほぼ変わらない
export const BACKGROUND_FPS = 30
// 解像度の段 (ADR 0012)。重い環境では 1 段ずつ下げ、最小でも 0.5 倍で描く。
// 全画面のシェーダーは描く画素数に比例して重くなるので、最小まで下げると 1/4 の負荷になる
export const BACKGROUND_DPR_STEPS = [1.75, 1, 0.5] as const
// 解像度の上限。高解像度の画面でもこの倍率までにして、描く画素の数を抑える
export const BACKGROUND_DPR_MAX: number = BACKGROUND_DPR_STEPS[0]
// 重い端末で下げる先の下限 (段の末尾)。GPU の無い環境でも描画がページを詰まらせないようにする
export const BACKGROUND_DPR_MIN: number = BACKGROUND_DPR_STEPS[2]
// これを下回ったら重いとみなして解像度を下げる。30fps に間引くので、その少し下に置く
export const BACKGROUND_MIN_FPS = 24

// 1 段下の解像度を返す。既に最小以下なら最小のまま返す。
// 一気に最小へ落とすと見た目が急に変わるので、重いと判定されるたびに 1 段ずつ下げる
export function lowerBackgroundDpr(current: number): number {
  const lower = BACKGROUND_DPR_STEPS.filter((step) => step < current)
  return lower.length === 0 ? BACKGROUND_DPR_MIN : Math.max(...lower)
}

// レンダラー名がソフトウェア描画かどうか。GPU の無い環境では全画面のシェーダーが重く、
// ページの操作を詰まらせるので、最初から最小の解像度で描く
const SOFTWARE_RENDERER_PATTERNS = ["swiftshader", "llvmpipe", "softpipe", "software", "basic render"]

export function isSoftwareRenderer(renderer: string | null | undefined): boolean {
  if (!renderer) return false
  const name = renderer.toLowerCase()
  return SOFTWARE_RENDERER_PATTERNS.some((pattern) => name.includes(pattern))
}

// 次に描く時刻を返す。間隔に満たなければ null (このフレームは描かない)。
// 描くときは端数を持ち越し、rAF の間隔が interval で割り切れなくても平均で interval ごとに描く
export function nextFrameTime(now: number, last: number | null, interval: number): number | null {
  if (last === null) return now
  const elapsed = now - last
  if (elapsed < interval) return null
  return now - (elapsed % interval)
}

// 描画に使う時刻をループの 1 周の中の値に畳む。経過時間をそのままシェーダーに渡すと、
// 長く開いたままのときに浮動小数の精度が落ちて動きがカクつく。動きは周期なので、
// 余りにしても見た目は変わらない。ループの長さが 0 以下なら割れないので 0 を返す
export function loopTime(elapsedSeconds: number, loopSeconds: number): number {
  if (loopSeconds <= 0) return 0
  return elapsedSeconds % loopSeconds
}
