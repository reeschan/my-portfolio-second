import { notifySlack } from "@/lib/slack/notify"
import { revalidateNowPosts } from "./cached"
import { nowTranslationFailedMessage } from "./notify"
import type { NowPost } from "./schema"
import { getNowStore, type NowPostStore } from "./store"
import { translateNowPost } from "./translate"

// 投稿・書き換えの応答を返したあとに、自動訳を作って記事に英語版として保存する (docs/specs/now-post-english.md)。
// 訳している間に記事が変わっていたら、古い内容の訳で上書きしない

// 訳の間に記事が変わって、この訳がもう古いかの判定 (自動訳と訳し直しの両方が使う)。
// 消えた・日本語が変わった・英語版が変わった (持ち主の訳が送られた) なら古い
function staleReason(current: NowPost | null, started: Pick<NowPost, "title" | "body">, startedEn: string): "gone" | "changed" | null {
  if (!current) return "gone"
  if (japaneseChanged(started, current) || JSON.stringify(current.en) !== startedEn) return "changed"
  return null
}

// 日本語の題名か本文が変わったか。書き換えで英語版を作り直すかの判定に使う
export function japaneseChanged(before: Pick<NowPost, "title" | "body">, after: Pick<NowPost, "title" | "body">): boolean {
  return before.title !== after.title || before.body !== after.body
}

// after() に渡す入口。after() の中の失敗は応答で返せないので、ここで捕まえてログに残す (投げない)
export async function autoTranslateAfterWrite(id: string): Promise<void> {
  try {
    await translateAndSave(id)
  } catch (error) {
    // 保存先の失敗などは利用者に返せない。次の機会に気付けるようログに残す
    console.error(`/now の自動訳 (${id}): 失敗しました`, error)
  }
}

async function translateAndSave(id: string): Promise<void> {
  const store = getNowStore()
  // 保存先が無ければ記事も無い (本番で Redis が未設定)。訳す対象が無いので何もしない
  if (!store) return

  const before = await store.get(id)
  if (!before) return
  // 訳し始めた時点の内容を控える。訳の間に書き換えられたら、この控えと比べて捨てる
  const started = { title: before.title, body: before.body }
  const startedEn = JSON.stringify(before.en)

  const translation = await translateNowPost({ title: started.title, body: started.body })
  if (!translation.ok) {
    // API キーが無いのは設定漏れだが、持ち主が訳を使わない選択でもあるので知らせない
    if (translation.reason === "failed") await notifySlack(nowTranslationFailedMessage(before, translation.detail))
    return
  }

  const current = await store.get(id)
  if (staleReason(current, started, startedEn)) return

  await store.save({
    ...current!,
    en: { title: translation.title, body: translation.body, source: "auto", updatedAt: new Date().toISOString() },
  })
  // 英語版を付けた記事が次の表示に出るよう、作り置きを捨てる
  revalidateNowPosts()
}

export type TranslateNowResult =
  | { ok: true; post: NowPost }
  | { ok: false; reason: "not-configured" }
  | { ok: false; reason: "failed"; detail: string }
  | { ok: false; reason: "gone" }
  | { ok: false; reason: "changed" }

// 訳し終えるまで待ち、英語版を保存して記事を返す (訳し直しの API 用)。持ち主の訳があっても置き換える。
// 呼んだ人が結果を直接受け取るので Slack には知らせない。訳に失敗したら記事は変えない。
// 訳の間に記事が消えた・変わったときは、古い内容で上書きしない
export async function translateNowPostNow(store: NowPostStore, post: NowPost): Promise<TranslateNowResult> {
  const started = { title: post.title, body: post.body }
  const startedEn = JSON.stringify(post.en)
  const translation = await translateNowPost(started)
  if (!translation.ok) return translation

  const current = await store.get(post.id)
  const stale = staleReason(current, started, startedEn)
  if (stale) return { ok: false, reason: stale }

  const saved: NowPost = {
    ...current!,
    en: { title: translation.title, body: translation.body, source: "auto", updatedAt: new Date().toISOString() },
  }
  await store.save(saved)
  // 英語版を付けた記事が次の表示に出るよう、作り置きを捨てる
  revalidateNowPosts()
  return { ok: true, post: saved }
}
