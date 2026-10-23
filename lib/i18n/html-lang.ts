import { localeCookieName, locales } from "./config"

// <head> のインラインのスクリプトが描く前に読むので、Cookie の名前と言語の一覧は config.ts から組み立てる。
// PBI-011 でルートのレイアウトが Cookie を読まなくなると、英語の閲覧者にも既定の ja が出てしまう。
// そのときもブラウザが HTML を読む間に lang を合わせられるよう、サーバーではなくクライアントの Cookie を見る

// 値を <script> の中の JS のリテラルとして埋め込む。JSON.stringify だけでは `</script>` で script タグを閉じられ、
// U+2028・U+2029 は古い JS では文字列を壊すので、それらを Unicode エスケープにする (CodeQL の js/bad-code-sanitization)
const toScriptLiteral = (value: unknown) =>
  JSON.stringify(value).replace(/[<>\/\u2028\u2029]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`)

// 同じ文字列を毎回返すので、モジュールの読み込み時に一度だけ組み立てる。
// Cookie の名前で正規表現を組み立てると、名前の記号を逃がし損ねたときにコードが壊れるので、"; " で分けて先頭で比べる
const script = `(function(){try{var n=${toScriptLiteral(`${localeCookieName}=`)},l=${toScriptLiteral(locales)},c=document.cookie.split("; ");for(var i=0;i<c.length;i++){if(c[i].indexOf(n)===0){var v=decodeURIComponent(c[i].slice(n.length));if(l.indexOf(v)!==-1){document.documentElement.lang=v}break}}}catch(e){}})()`

// 即時実行の関数の JS 文字列を返す。知らない値・Cookie なし・例外のときは何もしない (既定の lang を残す)
export function htmlLangScript(): string {
  return script
}
