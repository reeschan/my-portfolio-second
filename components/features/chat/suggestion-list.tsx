import { Button } from "@/components/ui/button"

type SuggestionListProps = {
  suggestions: readonly string[]
  onSelect: (text: string) => void
}

// 最初の質問の候補。押すとそのまま送信する
export function SuggestionList({ suggestions, onSelect }: SuggestionListProps) {
  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {suggestions.map((s) => (
        <Button key={s} variant="outline" size="sm" className="h-auto whitespace-normal py-1.5 text-left" onClick={() => onSelect(s)}>
          {s}
        </Button>
      ))}
    </div>
  )
}
