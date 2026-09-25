// IP ごとの簡易レート制限。サーバーレスではインスタンスごとに状態が分かれるため、あくまで API 料金の使いすぎを抑えるための目安
const windowMs = 10 * 60 * 1000
const maxRequests = 20

const hits = new Map<string, number[]>()

export function isRateLimited(key: string) {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)

  if (recent.length >= maxRequests) {
    hits.set(key, recent)
    return true
  }

  recent.push(now)
  hits.set(key, recent)

  // 古いエントリが溜まり続けないよう、ときどき掃除する
  if (hits.size > 1000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= windowMs)) hits.delete(k)
    }
  }

  return false
}
