// AI の回答に連絡先らしき文字列が混ざった場合に伏せ字にする (プロンプトを突破された場合の保険)
const patterns: RegExp[] = [
  // メールアドレス
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  // 電話番号 (国内・国際表記)
  /(?<!\d)(?:\+81[-\s]?|0)\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4}(?!\d)/g,
  // 郵便番号
  /(?<!\d)〒?\s?\d{3}-\d{4}(?!\d)/g,
]

export function redact(text: string) {
  return patterns.reduce((acc, pattern) => acc.replace(pattern, "［非公開］"), text)
}

// ストリームの途中でパターンが分断されないよう、空白・改行の位置で区切ってから伏せ字処理する
export function createRedactingStream() {
  // 連絡先は空白や句読点を含まない前提で、末尾のこの文字数は次のチャンクが来るまで保留する
  const holdBack = 64
  const boundaries = [" ", "\n", "　", "。", "、"]
  let pending = ""

  return new TransformStream<string, string>({
    transform(chunk, controller) {
      pending += chunk
      if (pending.length <= holdBack) return

      const limit = pending.length - holdBack
      const cut = Math.max(...boundaries.map((b) => pending.lastIndexOf(b, limit)))
      if (cut <= 0) return

      controller.enqueue(redact(pending.slice(0, cut + 1)))
      pending = pending.slice(cut + 1)
    },
    flush(controller) {
      if (pending) controller.enqueue(redact(pending))
    },
  })
}
