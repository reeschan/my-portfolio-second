"use client"

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ChatMessage } from "@/types/chat-types"
import { ChatBubble } from "./chat-bubble"
import { SuggestionList } from "./suggestion-list"

const greeting = "こんにちは！職務経歴やスキルについて、気になることを何でも聞いてください。"

const suggestions = [
  "これまでの経歴を簡単に教えてください",
  "得意な技術スタックは？",
  "リーダー経験について教えてください",
  "AWS の経験と資格は？",
]

// API が返したエラー文 ({ error: string }) を取り出す。形が違えば決まった文言にする
async function errorMessageOf(res: Response): Promise<string> {
  const data: unknown = await res.json().catch(() => null)
  if (typeof data === "object" && data !== null && "error" in data && typeof data.error === "string") return data.error
  return "回答の取得に失敗しました。"
}

// ストリームを読み切り、途中経過を onProgress に渡す。読み終えた全文を返す
async function readStream(body: NonNullable<Response["body"]>, onProgress: (partial: string) => void): Promise<string> {
  const reader = body.pipeThrough(new TextDecoderStream()).getReader()
  let answer = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) return answer
    answer += value
    onProgress(answer)
  }
}

export function ResumeChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  async function send(text: string) {
    const content = text.trim()
    if (!content || isLoading) return

    const history: ChatMessage[] = [...messages, { role: "user", content }]
    setMessages([...history, { role: "assistant", content: "" }])
    setInput("")
    setError(null)
    setIsLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      })

      if (!res.ok || !res.body) throw new Error(await errorMessageOf(res))

      const answer = await readStream(res.body, (partial) => {
        setMessages([...history, { role: "assistant", content: partial }])
      })
      if (!answer) throw new Error("回答が空でした。もう一度お試しください。")
    } catch (e) {
      // 失敗した質問は入力欄に戻して、再送しやすくする
      setMessages(messages)
      setInput(content)
      setError(e instanceof Error ? e.message : "回答の取得に失敗しました。")
    } finally {
      setIsLoading(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    // 失敗は send の中で画面に出すので、ここでは待たない
    void send(input)
  }

  // 日本語入力の変換確定の Enter で送信されないようにする
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && (e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault()
  }

  return (
    <div className="flex h-[560px] flex-col">
      {/* role="log": 新しい発言が読み上げられ、E2E でも会話の領域として取れる */}
      <div
        ref={scrollRef}
        role="log"
        aria-label="会話"
        className="flex-1 space-y-4 overflow-auto rounded-md border border-border/50 bg-background/50 p-4"
      >
        <ChatBubble role="assistant">{greeting}</ChatBubble>

        {messages.map((m, i) => (
          <ChatBubble key={i} role={m.role}>
            {m.content || <span className="animate-pulse text-muted-foreground">考え中…</span>}
          </ChatBubble>
        ))}

        {messages.length === 0 && <SuggestionList suggestions={suggestions} onSelect={(text) => void send(text)} />}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="経歴について質問する..."
          maxLength={1000}
          disabled={isLoading}
          className="flex-1"
          aria-label="質問"
        />
        <Button type="submit" disabled={isLoading || !input.trim()}>
          送信
        </Button>
      </form>

      <p className="mt-2 text-xs text-muted-foreground">
        職務経歴や保有している知識や技術、人柄について大まかに回答します。
        <br />
        詳細については LinkedIn やメールにてメッセージをいただけると幸いです。
      </p>
    </div>
  )
}
