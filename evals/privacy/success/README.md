# Success した eval の記録

`pnpm eval:privacy` が `cases.yml` の基準を満たしたときに、結果がここに保存される。ファイル名は `YYYY-MM-DD-<モデル>-<プロンプトのハッシュ>.json`。

- 手で作ったり書き換えたりしない
- プロンプト (`lib/chat/system-prompt.ts`) を変える PR には、そのプロンプトで合格した記録を 1 つ入れる
- 古い記録は消さない (どの版がどのモデルで合格したかの履歴になる)
