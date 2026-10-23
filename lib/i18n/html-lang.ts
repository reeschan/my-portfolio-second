import { localeCookieName, locales } from "./config"

// <head> のインラインのスクリプトが描く前に読むので、Cookie の名前と言語の一覧は config.ts から組み立てる。
// PBI-011 でルートのレイアウトが Cookie を読まなくなると、英語の閲覧者にも既定の ja が出てしまう。
// そのときもブラウザが HTML を読む間に lang を合わせられるよう、サーバーではなくクライアントの Cookie を見る
const escapeForRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// 同じ文字列を毎回返すので、モジュールの読み込み時に一度だけ組み立てる
const script = `(function(){try{var m=document.cookie.match(/(?:^|; )${escapeForRegExp(localeCookieName)}=([^;]*)/);var v=m&&decodeURIComponent(m[1]);if(v&&${JSON.stringify(locales)}.indexOf(v)!==-1){document.documentElement.lang=v}}catch(e){}})()`

// 即時実行の関数の JS 文字列を返す。知らない値・Cookie なし・例外のときは何もしない (既定の lang を残す)
export function htmlLangScript(): string {
  return script
}
