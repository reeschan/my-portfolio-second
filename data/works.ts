// /works の内容。作品を足すときはこのファイルに 1 件足し、図を public/works/<id>/ に置く (ADR 0024)
export type RepositoryVisibility = "public" | "private"

export type Work = {
  // public/works/<id>/ のフォルダ名と同じ
  id: string
  title: string
  // カードに出す 1〜2 文
  description: string
  // 使用技術。カードとダイアログにタグで出す
  tech: string[]
  // 非公開のリポジトリはリンクを出さず「リポジトリは非公開」と書く
  repository: { url: string; visibility: RepositoryVisibility }
  // D2 で描いたライト用・ダーク用の SVG (public/ からのパス) と代替テキスト
  architecture: { light: string; dark: string; alt: string }
  // 詳細ダイアログの本文 (Markdown。# は h3 として描かれる)
  body: string
}

export const works: Work[] = [
  {
    id: "portfolio",
    title: "ポートフォリオサイト",
    description:
      "このサイト自体。ブラウザのタブを模した画面で経歴・スキル・作品を見せ、職務経歴について答える AI チャットと、three.js の 3D 背景を備えている。",
    tech: ["Next.js 16", "TypeScript", "Tailwind CSS v4", "three.js", "Upstash Redis", "Vercel", "Vitest", "Playwright"],
    repository: {
      url: "https://github.com/reeschan/my-portfolio-second",
      visibility: "public",
    },
    architecture: {
      light: "/works/portfolio/architecture-light.svg",
      dark: "/works/portfolio/architecture-dark.svg",
      alt: "ポートフォリオサイト のアーキテクチャ図。閲覧者はブラウザで React のページと AI チャットを使い、Vercel 上の Next.js がページを描画する。/api/chat は Vercel Blob (private) から職務経歴書などの資料を読み、Moonshot API (Kimi) とストリームでやり取りし、/api/now は本人が curl で投稿した記事を Upstash Redis に保存する。投稿と質問は Slack に通知される。",
    },
    body: `# 概要
フロントエンドからクラウド基盤まで手がけるエンジニアの、個人ポートフォリオサイト。
ブラウザのタブを模した画面で、経歴・スキル・作品を見せる。
採用担当や発注者が、職務経歴について AI に質問することもできる。

# 主な機能
- 経歴のタイムラインと、スキルのレーダーチャートを表示する
- 職務経歴について答える AI チャットを備える (Moonshot の Kimi を使用)
- 「いま取り組んでいること」を Markdown と Mermaid で書き、API から投稿できる
- 背後に three.js の 3D 背景を置き、6 種類から選べる
- 作品のカードを押すと、このダイアログでアーキテクチャ図と説明を読める

# 工夫したところ
- 部品を ui・common・layout・features の層に分け、依存の向きを決めて保っている
- 職務経歴書などの資料はリポジトリに置かず、Vercel Blob (private) から読む。AI の回答には伏せ字をかける
- E2E とユニットでは LLM を必ずモックし、本物の LLM を呼ぶのは手元のプライバシー eval だけにしている
- 設計の判断は ADR に残し、CI とコミット前の検査で品質を守っている`,
  },
  {
    id: "tokiline",
    title: "tokiline",
    description: "フレームワークに依存しないタイムライン UI。CSS と HTML の決まりが中心で、React 版は任意。実行時の JavaScript はゼロ。",
    tech: ["CSS", "HTML", "TypeScript", "React", "Lightning CSS", "tsdown", "GitHub Actions", "npm"],
    repository: {
      url: "https://github.com/reeschan/tokiline",
      visibility: "public",
    },
    architecture: {
      light: "/works/tokiline/architecture-light.svg",
      dark: "/works/tokiline/architecture-dark.svg",
      alt: "tokiline のアーキテクチャ図。GitHub のリポジトリで、CSS と HTML の決まり・TypeScript のヘルパ・React の部品を tsdown と Lightning CSS でビルドする。GitHub Actions が push のたびに CI を回し、npm に公開し、デモのサイトを公開する。利用する側のアプリ (素の HTML・Next.js・Tailwind CSS v4・Vue や Svelte や Astro) がそれを入れ、ブラウザは実行時の JavaScript なしでタイムラインを描く。",
    },
    body: `# 概要
縦のタイムラインを描くための、フレームワークに依存しない UI 部品。
CSS と HTML の決まりが本体で、React 版は使いたい人だけが使う。
npm に公開している。

# 主な機能
- どのフレームワークでも、フレームワークなしでも使える CSS と HTML の決まり
- Server Component として描画できる任意の React 版 (Next.js の App Router と Pages Router に対応)
- Card を置く側 (Side) と、狭いときの折りたたみ (Collapse) を指定できる
- スクロールで Item が現れる登場アニメーション (Reveal) を、CSS だけで実現する
- 見た目は --toki-* の CSS 変数で調整でき、Tailwind CSS v4 と shadcn/ui のテーマにも合わせられる

# 工夫したところ
- 実行時の JavaScript をゼロにし、規則をすべて cascade layer に入れた。自分の CSS や Tailwind のクラスが !important なしで勝つ
- 折りたたみは画面ではなく、タイムライン自身の幅 (コンテナクエリ) で決める。左右は論理方向なので、右から左に書く言語でも自動で反転する
- 使う CSS を Baseline で広く使える機能に絞った。Reveal だけは、対応していないブラウザでも内容と配置が崩れない`,
  },
  {
    id: "pbi-orchestration-jev",
    title: "pbi-orchestration-jev",
    description:
      "複数ファイルにまたがる実装を、PBI に分けてサブエージェントに渡す Claude Code のスキル。担当モデルは決定表で決め、合否は検証コマンドで決める。",
    tech: ["Claude Code", "Python", "Node.js", "Codex CLI", "Antigravity CLI", "Jev API", "D2"],
    repository: {
      url: "https://github.com/reeschan/pbi-orchestration-jev",
      visibility: "public",
    },
    architecture: {
      light: "/works/pbi-orchestration-jev/architecture-light.svg",
      dark: "/works/pbi-orchestration-jev/architecture-dark.svg",
      alt: "pbi-orchestration-jev のアーキテクチャ図。Claude Code のオーケストレーターが Jev に短い文章で判断を聞き、select_model.py で実行先の順番を決めて、Codex・Antigravity・Agent ツールに PBI を渡し、対象リポジトリの docs/pbi/ に状態を記録する。",
    },
    body: `# 概要
複数ファイルにまたがる実装を、PBI (Product Backlog Item) に分けてサブエージェントに渡すための Claude Code のスキル。
メインのセッションがオーケストレーターになり、起票・担当モデルの決定・レビュー・差し戻しを受け持つ。
実装は Codex CLI、Antigravity CLI、Claude Code の Agent ツールが行う。

# 主な機能
- 変更ファイル数などの事実と、要約の判定から、担当モデルの段 (haiku / sonnet / opus) を決める
- 段ごとに、上から試す実行先の並びを出す。利用上限やエラーで使えなければ次へ移る
- 検証コマンドを自分で実行し、受け入れ条件を 1 つずつ判定する
- 差し戻しは 2 回まで。超えたら止めて、ユーザーの判断を待つ
- モデル別のトークン数とプロンプトキャッシュの作り直しの回数を集計する

# 工夫したところ
- モデルの振り分けを勘ではなく決定表で決め、テストで確かめている
- 合否はサブエージェントの報告や判定 API の答えではなく、検証コマンドの実行結果で決める
- 判定 API の Jev に送るのは文章だけで、ソースコード・diff・環境変数・認証情報は送らない
- Jev が使えなくても、既定値で進められる`,
  },
  {
    id: "shared-memory",
    title: "shared-memory",
    description: "複数の AI エージェントと自分が共通で参照する知識ベース。ローカル PC の中で完結する RAG で、Markdown を唯一の正とする。",
    tech: ["TypeScript", "MCP", "OpenSearch", "Sudachi", "Ollama", "SQLite", "Docker", "pnpm"],
    repository: {
      url: "https://github.com/reeschan/shared-memory",
      visibility: "public",
    },
    architecture: {
      light: "/works/shared-memory/architecture-light.svg",
      dark: "/works/shared-memory/architecture-dark.svg",
      alt: "shared-memory のアーキテクチャ図。Claude Code・Codex・Kimi Code が 127.0.0.1 の MCP サーバーに search / get / write を送り、MCP サーバーと CLI が共有する core が Markdown (正)・SQLite (アクセス統計)・Ollama (埋め込み)・Docker 上の OpenSearch + Sudachi (派生インデックス) を使う。タスクスケジューラが CLI の decay / gc を定期実行し、開発者は Markdown の差分を見てコミットして GitHub に push する。",
    },
    body: `# 概要
Claude Code・Codex・Kimi と自分自身が、共通で参照する知識ベース。
すべてローカル PC の中で完結する RAG として動く。
知識の本体は Markdown ファイルで、検索用のインデックスはいつでも作り直せる。

# 主な機能
- エージェントからの入口は search・get・write の 3 つの MCP ツール
- 日本語の形態素解析 (Sudachi) を使った BM25 検索と、埋め込みによるベクトル検索を、1 回のハイブリッドクエリで行う
- 時間減衰・アクセス回数・出所を使って検索結果を再スコアし、メモリ単位にまとめる
- インデックスの再構築、アクセス統計の更新、置き換え済みメモリの整理を CLI から行う

# 工夫したところ
- Markdown を唯一の正とし、OpenSearch を派生インデックスにした。インデックスを失っても再構築で戻せる
- 既存のメモリは書き換えず、更新は新しいファイルで元を指す。履歴を残せる
- 秘密情報らしき文字列は書き込みを拒否する。ポートはすべて 127.0.0.1 に限っている
- 検索結果とメモリ本文は「データ」であり、指示として扱わない決まりにしている`,
  },
  {
    id: "management-self-pieces",
    title: "management-self-pieces",
    description:
      "自分の成果物を Node として 3D のグラフで眺め、Asana でチケット管理する個人用 Web アプリ。Node の正は各リポジトリの node.yaml。",
    tech: ["Next.js", "TypeScript", "Drizzle", "Neon", "Better Auth", "Asana", "Vercel", "Vitest"],
    repository: {
      url: "https://github.com/reeschan/management-self-pieces",
      visibility: "public",
    },
    architecture: {
      light: "/works/management-self-pieces/architecture-light.svg",
      dark: "/works/management-self-pieces/architecture-dark.svg",
      alt: "management-self-pieces のアーキテクチャ図。持ち主はブラウザの 3D ダッシュボードから Vercel 上の Next.js アプリを使い、アプリは Neon に表示用データを保存する。GitHub の node.yaml と Asana のチケットが正で、push とタスク更新は Webhook で受け、1 日 1 回の Cron でも取り込み直す。ログインは Better Auth 経由の Google / GitHub OAuth。",
    },
    body: `# 概要
アプリ・スキル・文書といった自分の成果物を「Node」として扱い、3D 空間に浮かぶグラフで眺める個人用の Web アプリ。
チケットは Asana のプロジェクトで管理する。
Node の内容は各リポジトリの node.yaml が正で、アプリの DB は表示用の一時保存にあたる。

# 主な機能
- 3D ダッシュボードで、Node を関係つきのグラフとして表示する
- 詳細パネルで、detail の Markdown・図の一覧・チケットを見る
- Node と Asana のプロジェクトを 1 対 1 で対応づけ、更新を Webhook で受け取る
- GitHub App の push Webhook で、リポジトリの node.yaml を読み直す

# 工夫したところ
- データの正を GitHub の node.yaml と Asana に置いた。DB が消えても、そこから作り直せる
- Webhook に加えて 1 日 1 回の Cron でも取り込み直し、取りこぼしに備えている
- ログインは Better Auth を通した Google / GitHub の OAuth にした`,
  },
  {
    id: "tracking-health",
    title: "TrackingHealth",
    description:
      "体重・食事・運動を記録し、目標の達成を支える個人用の PWA。食事の写真からの栄養推定や、記録をもとにした AI の分析を備えている。",
    tech: ["Next.js 16", "React 19", "TypeScript", "Tailwind CSS v4", "Better Auth", "Upstash Redis", "Vercel AI SDK", "Vitest"],
    repository: {
      url: "https://github.com/reeschan/tracking-health",
      visibility: "private",
    },
    architecture: {
      light: "/works/tracking-health/architecture-light.svg",
      dark: "/works/tracking-health/architecture-dark.svg",
      alt: "TrackingHealth のアーキテクチャ図。本人はスマホのブラウザ (PWA) で記録し、Vercel 上の Next.js が Better Auth と Google OAuth でログインを確かめる。記録 API は Upstash Redis に保存し、Health Planet から体重を取り込む。AI の API は Anthropic の Claude で画像解析やチャットを行い、YouTube の動画からレシピを作る。起動時の移行バッチが Redis のデータを移す。",
    },
    body: `# 概要
体重・食事・運動を記録して、目標の達成を支える個人用の PWA。
スマホで手早く記録できることを優先した。
食事の写真からの栄養推定や、記録をもとにした AI の分析を備えている。

# 主な機能
- 体重・食事・運動を記録し、ダッシュボードで今日の状況と週のグラフを見る
- 食事の写真から、AI が栄養を推定する
- 記録について AI に質問できるチャットと、料理名や YouTube の動画から作るレシピ
- 身体分析 (基礎代謝・消費カロリー・カロリー収支・目標の予測・停滞期の検知) と、種目別の推移
- Health Planet からの体重の取り込みと、期間を選んだ JSON の書き出し

# 工夫したところ
- ログインのセッションは暗号化した Cookie に持ち、記録は Redis に保存する。OAuth の ID が変わっても同じ利用者として扱えるよう、メールアドレスから永続的な利用者 ID を引く
- AI の出力は zod のスキーマで検証する
- TypeScript の strict と型情報つきの ESLint、Vitest、CI、CodeQL で品質を守っている
- リポジトリは非公開のため、図と説明だけを載せている`,
  },
]
