// カードに出す本文の抜粋。Markdown の記号を落として平文にし、先頭から切り出す
// (きっちりした変換ではなく、カードで読める程度の目安)
const replacements: [RegExp, string][] = [
  [/```[\s\S]*?(```|$)/g, " "], // コードブロック (mermaid の図を含む) は抜粋に出さない
  [/`([^`]*)`/g, "$1"], // インラインコード
  // 画像は代替テキストごと落とす (長い代替テキストが抜粋を埋めないように)。
  // リンクより先に落とすので、画像のリンク [![alt](img)](url) は空のリンクになって消える
  [/!\[[^\]]*\]\([^)]*\)/g, " "], // 画像 ![alt](url) と ![alt](url "題")
  [/!\[[^\]]*\]\[[^\]]*\]/g, " "], // 参照形式の画像 ![alt][ref]
  [/^\s{0,3}\[[^\]]+\]:[^\n]*$/gm, " "], // 参照形式の定義行 [ref]: url (URL を抜粋に出さない)
  [/\[([^\]]*)\]\([^)]*\)/g, "$1"], // リンクは文字だけ
  [/^[\s|:-]*-{3,}[\s|:-]*$/gm, " "], // 区切り線と、表の見出しの下の --- の行
  [/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, ""], // 見出し・引用・箇条書きの印
  [/^\[[ xX]\]\s+/gm, ""], // チェックリストの印
  [/(\*\*|__|\*|_|~~)(?=\S)([^*_~]*?\S)\1/g, "$2"], // 強調・打ち消し
  [/\|/g, " "], // 表の区切り
]

export function excerptOf(markdown: string, maxLength = 100): string {
  const text = replacements
    .reduce((s, [pattern, replacement]) => s.replace(pattern, replacement), markdown)
    .replace(/\s+/g, " ")
    .trim()
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text
}
