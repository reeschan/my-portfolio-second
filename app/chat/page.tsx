import { PageTemplate } from "@/components/page-template"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function ChatPage() {
  return (
    <PageTemplate title="チャット">
      <div className="flex h-[500px] flex-col">
        <div className="flex-1 space-y-4 overflow-auto rounded-md border border-border/50 bg-background/50 p-4">
          <div className="ml-auto max-w-[80%] rounded-lg bg-primary/10 p-3 text-sm">
            こんにちは！何かお手伝いできることはありますか？
          </div>

          <div className="mr-auto max-w-[80%] rounded-lg bg-muted p-3 text-sm">
            ポートフォリオについて質問があります。
          </div>

          <div className="ml-auto max-w-[80%] rounded-lg bg-primary/10 p-3 text-sm">
            どのようなご質問でしょうか？お気軽にお聞きください。
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Input placeholder="メッセージを入力..." className="flex-1" />
          <Button>送信</Button>
        </div>
      </div>
    </PageTemplate>
  )
}

