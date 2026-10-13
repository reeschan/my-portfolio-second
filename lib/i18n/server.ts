import { cookies } from "next/headers"
import { messagesOf, type Messages } from "@/data/messages"
import { localeCookieName, resolveLocale, type Locale } from "./config"

// Server Component から今の表示言語を読む。cookies() を使うので、読んだページはリクエストごとに描画される
export async function getLocale(): Promise<Locale> {
  const store = await cookies()
  return resolveLocale(store.get(localeCookieName)?.value)
}

export async function getMessages(): Promise<Messages> {
  return messagesOf(await getLocale())
}
