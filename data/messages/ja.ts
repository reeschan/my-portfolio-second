// 画面の固定の文言 (日本語)。英語版は en.ts。キーを足したら両方に足す (型で漏れを検出する)
import type { BackgroundThemeId } from "@/lib/background-theme"
import type { NavId } from "@/lib/navigation"

export const ja = {
  // 検索結果と OGP に出すサイトの説明。ページごとの説明がないトップで使う
  site: {
    description:
      "フロントエンドからクラウド基盤まで一人で通して作るフルスタックデベロッパー、Ryuki Tobita のポートフォリオ。経歴・スキル・制作物を載せ、職務経歴について AI に質問できる。",
  },
  nav: {
    overview: "概要",
    career: "経歴",
    skills: "スキル",
    works: "ワーク",
    now: "Now",
    chat: "チャット",
    contact: "お問い合わせ",
    theme: "テーマ",
  } satisfies Record<NavId, string>,
  layout: {
    pages: "ページ切り替え",
    rss: "RSSフィード",
    rssTitle: "RSSフィードを購読",
    language: "表示言語",
    close: "閉じる",
  },
  overview: {
    description: "Ryuki Tobita のプロフィールと、このサイトの各ページの案内",
    profile: "プロフィール",
    profileLinks: "外部のプロフィール",
    guide: "このサイトの歩き方",
    guideList: "各ページの案内",
  },
  career: {
    description: "勤務先とフリーランスでの参画案件のタイムライン",
    present: "現在",
    ongoing: "継続中",
    clients: "参画先",
    engagements: "参画案件の詳細",
    tech: "使用技術",
  },
  skills: {
    description: "フロントエンド・バックエンド・AWS のスキルと保有資格",
    overviewTab: "概要",
    overviewTitle: "スキルレーダー (5段階評価)",
    overviewTitleShort: "スキル概要",
    categoryTitle: (category: string) => `${category}スキル (5段階評価)`,
    certifications: "資格ハイライト",
    level: "スキルレベル",
    legend: "スキルレベル (5段階評価)",
  },
  works: {
    description: "制作したもの",
    tech: "使用技術",
    architecture: "アーキテクチャ",
    repository: "リポジトリ: ",
    privateRepository: "リポジトリは非公開",
    // アーキテクチャ図の拡大表示 (PBI-0021)
    enlarge: "アーキテクチャ図を拡大する",
    enlargeHint: "図を押すと拡大して見られます",
    viewerTitle: (title: string) => `${title} のアーキテクチャ`,
    zoomIn: "拡大",
    zoomOut: "縮小",
    zoomFit: "全体を表示",
    diagramArea: "図の表示領域",
    zoomLevel: "表示の倍率",
    openOriginal: "元の図を新しいタブで開く",
  },
  now: {
    description: "いま取り組んでいること",
    intro: "いま取り組んでいることを、新しい順に並べています。",
    // 更新日の前後に付ける文言。日付は <time> で囲むので文言と分けて持つ
    updatedBefore: "",
    updatedAfter: "更新",
    // 記事は日本語だけで書くので、英語のときだけ断り書きを出す
    languageNote: "",
    loadError: "記事を読み込めませんでした。時間をおいて再度お試しください。",
    empty: "まだ投稿はありません。",
    recent: "最近の投稿",
    // 記事のページ (/now/[id]) から一覧へ戻るリンク
    backToList: "記事の一覧へ戻る",
    dialogUpdatedBefore: "（",
    dialogUpdatedAfter: "更新）",
    inspiredBefore: "このページは ",
    inspiredAfter: " の考え方にならっています。",
  },
  chat: {
    description: "職務経歴について AI に質問できるチャット",
    greeting: "こんにちは！職務経歴やスキルについて、気になることを何でも聞いてください。",
    suggestions: [
      "これまでの経歴を簡単に教えてください",
      "得意な技術スタックは？",
      "リーダー経験について教えてください",
      "AWS の経験と資格は？",
    ],
    log: "会話",
    thinking: "考え中…",
    empty: "回答が空でした。もう一度お試しください。",
    failed: "回答の取得に失敗しました。",
    placeholder: "経歴について質問する...",
    input: "質問",
    send: "送信",
    note: [
      "職務経歴や保有している知識や技術、人柄について大まかに回答します。",
      "詳細については LinkedIn やメールにてメッセージをいただけると幸いです。",
    ],
  },
  contact: {
    description: "持ち主へのお問い合わせのフォーム",
    lead: "お仕事のご依頼やご質問は、こちらからお送りください。",
    name: "お名前",
    email: "メールアドレス",
    message: "本文",
    messageHint: "10〜2000 字",
    privacy: "いただいた情報は返信のためだけに使い、第三者には渡しません。",
    submit: "送信する",
    sending: "送信中…",
    receivedTitle: "お問い合わせを受け付けました",
    receivedBody: "いただいたメールアドレスに返信します。",
    again: "別のお問い合わせを送る",
    // 送信の失敗。API の文言は日本語だけなので、画面では応答のステータスに応じてこちらを出す
    errors: {
      invalid: "入力内容を確かめてください。",
      tooMany: "送信が多すぎます。しばらく時間をおいてからお試しください。",
      unavailable: "現在お問い合わせを受け付けられません。",
      failed: "送信に失敗しました。時間をおいてもう一度お試しください。",
    },
    // 項目ごとのエラー。送る前に lib/contact/schema.ts の決まりで確かめた結果を出す
    nameRequired: "お名前を入力してください。",
    nameTooLong: "お名前は 100 字以内で入力してください。",
    emailInvalid: "メールアドレスの形式が正しくありません。",
    messageLength: "本文は 10〜2000 字で入力してください。",
  },
  theme: {
    description: "背景の 3D シーンを選べます",
    heading: "背景を選ぶ",
    intro:
      "サイト全体の背景に流れる 3D シーンを切り替えられます。選んだテーマはこのブラウザに保存され、次に開いたときも同じ背景で表示されます。",
    legend: "背景のテーマ",
    themes: {
      // ラジオボタンの名前 (アクセシブルネーム) にもなる表示名と、カードに出す一言の説明
      grid: { label: "グリッド", description: "浮遊する多面体と粒子。サイト開設時からの既定の背景" },
      aurora: { label: "オーロラ", description: "雪山の稜線の上で揺れるオーロラと、それを映す凍った湖" },
      "moonlit-sea": { label: "月夜の海", description: "雲間の満月と、波に揺れる月の道" },
      "firefly-forest": { label: "蛍の森", description: "霧の立ちこめる針葉樹の森を舞う蛍" },
      "lunar-surface": { label: "月面", description: "クレーターの並ぶ月の地平線から昇る地球" },
      eclipse: { label: "皆既日食", description: "闇に浮かぶ黒い太陽とコロナ、漂う星雲" },
    } satisfies Record<BackgroundThemeId, { label: string; description: string }>,
  },
}

export type Messages = typeof ja
