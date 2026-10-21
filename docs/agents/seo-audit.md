# 本番の SEO 監査 (jev-seo) の手順

PBI-0027 (正のホストを apex に揃える) と PBI-0028 (SEO の 2 段目) が本番に出たあと、持ち主が手元で 1 回だけ外部の監査道具 [jev-seo](https://github.com/AgriciDaniel/jev-seo) を当て、テストに写していない観点の穴を探すときの手順。監査は CI でも定期実行でもなく、持ち主の手元の操作で行う (CONTEXT.md の「監査」)。

jev-seo はこのリポジトリにも CI にも入れない。道具はリポジトリの外に置き、結果もリポジトリの外に出す。

## いつ回すか

**PBI-0027 と PBI-0028 の両方が本番に出てから**回す。片方だけでは意味のある結果にならない。

- PBI-0027 は、正のホスト (canonical などが指すホスト) を apex に揃える、持ち主の Vercel の操作。
- PBI-0028 は、構造化データ・404・description・見出しなどの SEO の 2 段目。

正のホストが揃う前に当てると、jev-seo の `indexable()` が、canonical と巡回した URL の不一致で全ページを対象外にする。その結果、ページ単位の検査と Jev・PageSpeed の判定がトップのページだけになり、結果がほとんど空になる。順序を守る理由はこれ。

## 前提

- Python 3.10 以上。jev-seo の版は 0.1.1 (MIT ライセンス)。
- jev-seo は公開サイトを外から巡回する CLI で、52 本の検査・Jev (TypeSafe AI の LLM) による意味の判定・PageSpeed Insights で監査し、レポートを作る。**localhost には当てられない**ので、対象は本番の `https://reeschan.pink` だけになる。
- 所見があっても終了コードは変わらない。終了コードだけで良し悪しを判断しない。
- レポートの PDF に使う WeasyPrint は Pango を必要とし、Windows の手順は jev-seo に書かれていない。**Windows では WSL (Ubuntu) の中で回すのを勧める**。`bin/jevseo` は bash のスクリプトなので、WSL ならそのまま動く。
- レポートは Markdown だけにする (`--formats md`)。PDF を作らないので、Pango と WeasyPrint の用意を避けられる。

## 準備

1. jev-seo を**リポジトリの外**に取ってくる。例: `~/tools/jev-seo`。

   ```bash
   mkdir -p ~/tools
   git clone https://github.com/AgriciDaniel/jev-seo.git ~/tools/jev-seo
   ```

2. その中に venv を作り、依存を入れる。

   ```bash
   cd ~/tools/jev-seo
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

3. 鍵を環境変数 `TYPESAFE_API_KEY` で渡す (持ち主の TypeSafe AI のキー)。PageSpeed Insights の鍵は任意で `PAGESPEED_API_KEY`。

   ```bash
   export TYPESAFE_API_KEY=...      # 値は手元で入れる。ファイルには書かない
   export PAGESPEED_API_KEY=...     # 任意
   ```

   jev-seo は鍵を環境変数のほか `./.env` と `~/Desktop/Keys/.env` からも自動で読む。意図しない鍵を拾わないよう、**このリポジトリの中や、関係ない `.env` があるディレクトリでは動かさない**。動かすのは手順 1 で作った `~/tools/jev-seo` の中だけにする。

4. 依存と鍵の有無を確かめる。

   ```bash
   bin/jevseo doctor
   ```

   `doctor` は依存と鍵があるかどうかを出す。鍵の値そのものは出ない。

## 回し方

`~/tools/jev-seo` の中で、本番のサイトを監査する。`--out` は必ずリポジトリの外のディレクトリにする (理由は「出力の扱い」)。

```bash
cd ~/tools/jev-seo
bin/jevseo audit https://reeschan.pink --out ~/tools/jev-seo-reports
```

続けて、その出力のディレクトリを Markdown のレポートにする。

```bash
bin/jevseo render ~/tools/jev-seo-reports --formats md
```

- **`--full` は付けない。** 有料の DataForSEO を使うオプションで、1 サイトあたり約 0.30 USD かかる。この監査では使わない。
- Jev の費用は 1 ページあたり約 0.00015 USD。使うのは持ち主の TypeSafe AI のキー。
- 所見があっても終了コードは変わらない。レポートを開いて中身を読む。

## 出力の扱い

- **`--out` は必ずリポジトリの外にする。** 既定はカレントの `jev-seo-reports/` なので、リポジトリの中で動かすと結果がリポジトリに紛れ込む。生成物はコミットしない。
- 監査は毎回、`audit.json` と `digest.md` を作る。
  - `audit.json` は巡回した公開ページの本文を含む。
  - `digest.md` は要約。
- Jev には公開ページの本文 (1 ページ最大 6,000 字) が送られる。このサイトの秘密の資料 (チャットの資料など) はサイトに出していないので、送られない。監査で外に出すのは公開ページの本文だけ、と分かって回す。

## 所見の扱い

- レポートの対応項目 (`JEV-###`) を読み、サイトに効くものを選ぶ。効くものは次の段の PBI の材料にする (この手順書の中では直さない)。
- 日本語のページは語数を少なく数えるので、「中身が薄い (thin_content)」の所見は誤検出の見込みがある。ほかの所見と同じ重さで扱わない。
- **`--no-jev` は付けない。** Jev の判定を使うのは持ち主の決定。付けると意味の判定がなくなり、監査の目的の半分が抜ける。

## やらないこと

- CI や定期実行で jev-seo を回すこと。本番のサイトと持ち主の鍵を使うので、自動では動かさない。
- jev-seo をこのリポジトリに入れること (コードも、依存も、設定も)。道具はリポジトリの外に置く。
- `--full` を付けること。有料の DataForSEO はこの監査の範囲ではない。
- `--out` をリポジトリの中にすること。`audit.json` をコミットしてしまわないため。
