# PBI 一覧

進め方は [docs/agents/development-flow.md](../agents/development-flow.md)。雛形は [_template/](_template/)。

| 番号 | タイトル | 状態 |
| --- | --- | --- |
| [0001](0001-base-foundation/PBI.md) | ベース実装の整備 (テーマ・共通コンポーネント・E2E・品質ゲート・開発の型) | 完了 |
| [0002](0002-background-themes/PBI.md) | 背景テーマを選べる「テーマ」タブと、夜・自然・月の写実的な 3D シーン | 進行中 |
| [0003](0003-code-quality-gates/PBI.md) | 型の厳格化・循環的複雑度の上限・ワークフローの整備 | 完了 |
| [0004](0004-now-posts/PBI.md) | /now をトークン付きの POST で投稿でき、カードとモーダルで読めるブログ風にする | 進行中 |
| [0005](0005-slack-notify/PBI.md) | /now の投稿・更新と AI チャットへの質問を Slack に通知する | 進行中 |
| [0006](0006-chat-docs-external-store/PBI.md) | チャットの資料をリポジトリから外し、Vercel Blob (private) から読む | 進行中 |
| [0007](0007-readme-architecture-diagram/PBI.md) | README にロゴ入りのアーキテクチャ図を載せる | 進行中 |
| [0008](0008-release-pr/PBI.md) | develop → main のリリース PR を自動で作り、main への PR は develop からだけ受け付ける | 進行中 |
| [0009](0009-ci-cost-owner-only/PBI.md) | Actions の費用を抑える: E2E は develop へのマージ後だけ、PR は持ち主と Dependabot だけ | 進行中 |
| [0010](0010-tokiline-timeline/PBI.md) | 経歴のタイムラインを自作ライブラリ tokiline に置き換える | 進行中 |
| [0011](0011-works-detail/PBI.md) | 自作の作品を /works に並べ、押すとアーキテクチャ図付きの詳細ダイアログを出す | 進行中 |
| [0012](0012-release-merge-commit/PBI.md) | リリース PR (develop → main) はマージコミットで入れ、毎回の衝突をなくす | 進行中 |
| [0013](0013-overview-and-career-copy/PBI.md) | 概要ページに自己紹介・外部リンク・各ページの案内を載せ、経歴の参画先を整える | 進行中 |
| [0014](0014-locale-switch/PBI.md) | 「準備中」のお知らせを消し、右上で日本語と英語を切り替えられるようにする | 進行中 |
| [0015](0015-now-markdown-file-upload/PBI.md) | /now の記事を Markdown のファイルのまま (Postman などで) 投稿できるようにする | 進行中 |
| [0016](0016-profile-avatar/PBI.md) | 概要のプロフィールにメインのアイコンを丸く載せる | 進行中 |
| [0017](0017-vercel-analytics/PBI.md) | Vercel Analytics で閲覧数を計測する | 進行中 |
| [0018](0018-contact-form/PBI.md) | お問い合わせフォームを足し、お問い合わせを Slack に届ける | 進行中 |
| [0019](0019-site-url-and-seo/PBI.md) | サイトの URL を reeschan.pink に揃え、検索と共有に備える | 進行中 |
| [0020](0020-now-rss-feed/PBI.md) | RSS に /now の記事を載せる | 進行中 |
| [0021](0021-architecture-viewer/PBI.md) | ワークのアーキテクチャ図を拡大して読めるようにする | 進行中 |
