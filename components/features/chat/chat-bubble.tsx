import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "@/types/chat-types"

// 会話の 1 発言。自分の発言は右、AI の発言は左に寄せる
export function ChatBubble({ role, children }: { role: ChatMessage["role"]; children: ReactNode }) {
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
