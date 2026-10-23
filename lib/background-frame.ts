// 3D 背景の描画の間引きと解像度の決まり。背景は動きがゆるやかなので、30fps でも見た目はほぼ変わらない
export const BACKGROUND_FPS = 30
// 解像度の上限 (ADR 0012)。高解像度の画面でも 1.75 倍までにして、描く画素の数を抑える
export const BACKGROUND_DPR_MAX = 1.75
// 重い端末で下げる先の解像度
export const BACKGROUND_DPR_MIN = 1
// これを下回ったら重いとみなして解像度を下げる。30fps に間引くので、その少し下に置く
export const BACKGROUND_MIN_FPS = 24

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
