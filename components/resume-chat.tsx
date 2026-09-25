"use client"

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "@/types/chat-types"

const greeting = "こんにちは！職務経歴やスキルについて、気になることを何でも聞いてください。"

const suggestions = [
  "これまでの経歴を簡単に教えてください",
  "得意な技術スタックは？",
  "リーダー経験について教えてください",
  "AWS の経験と資格は？",
]

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

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? "回答の取得に失敗しました。")
      }

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
      let answer = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        answer += value
        setMessages([...history, { role: "assistant", content: answer }])
      }

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
    send(input)
  }

  // 日本語入力の変換確定の Enter で送信されないようにする
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && (e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault()
  }

  return (
    <div className="flex h-[560px] flex-col">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-auto rounded-md border border-border/50 bg-background/50 p-4">
        <Bubble role="assistant">{greeting}</Bubble>

        {messages.map((m, i) => (
          <Bubble key={i} role={m.role}>
            {m.content || <span className="animate-pulse text-muted-foreground">考え中…</span>}
          </Bubble>
        ))}

        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {suggestions.map((s) => (
              <Button key={s} variant="outline" size="sm" className="h-auto whitespace-normal py-1.5 text-left" onClick={() => send(s)}>
                {s}
              </Button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

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
        AI (Kimi) が職務経歴書をもとに回答します。内容に誤りが含まれる場合があります。
      </p>
    </div>
  )
}

function Bubble({ role, children }: { role: ChatMessage["role"]; children: ReactNode }) {
  return (
    <div
      className={cn(
        "max-w-[80%] whitespace-pre-wrap rounded-lg p-3 text-sm",
        role === "user" ? "ml-auto bg-primary/10" : "mr-auto bg-muted",
      )}
    >
      {children}
    </div>
  )
}
