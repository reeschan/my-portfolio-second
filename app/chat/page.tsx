"use client";

import { useState } from "react";
import { useChat } from "ai/react";
import { PageTemplate } from "@/components/page-template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat();
  
  return (
    <PageTemplate title="チャット">
      <div className="flex h-[500px] flex-col">
        <div className="flex-1 space-y-4 overflow-auto rounded-md border border-border/50 bg-background/50 p-4">
          {messages.length === 0 ? (
            <div className="ml-auto max-w-[80%] rounded-lg bg-primary/10 p-3 text-sm">
              こんにちは！何かお手伝いできることはありますか？
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`${
                  message.role === "user"
                    ? "mr-auto bg-muted"
                    : "ml-auto bg-primary/10"
                } max-w-[80%] rounded-lg p-3 text-sm`}
              >
                {message.content}
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <Input
            placeholder="メッセージを入力..."
            value={input}
            onChange={handleInputChange}
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? "送信中..." : "送信"}
          </Button>
        </form>
      </div>
    </PageTemplate>
  );
}

