"use server"

import { cookies } from "next/headers"
import { isLocale, localeCookieMaxAge, localeCookieName } from "./config"

// 右上のスイッチから呼ぶ Server Function。Cookie を書き換えると、Next.js が今のページを新しい言語で描き直して返す
export async function setLocale(locale: unknown): Promise<void> {
  // クライアントからは任意の値が届きうるので、知らない言語は書き込まない
  if (!isLocale(locale)) return
  const store = await cookies()
  store.set(localeCookieName, locale, { path: "/", maxAge: localeCookieMaxAge, sameSite: "lax" })
}
