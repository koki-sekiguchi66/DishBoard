# DishBoard

食事と体重を記録する PWA（Django 5.2 + DRF + React 19 + PostgreSQL 16 + MCP サーバ）。

3つの役割を同時に担う。**迷ったらこの優先順**で判断する。

1. **実用ツール** — 研究室10〜20名が実際に使う。壊すと利用者に影響する
2. **ポートフォリオ** — public 公開。採用担当が読む。**判断の理由が残っていること自体が価値**
3. **学習教材** — 自分が理解できない実装を残さない

## 作業別に読むもの

**このファイルだけで作業を始めない。着手前に該当行を読む。**

| 作業 | 読む |
|---|---|
| backend 全般（層構造・データ設計・クエリ） | `backend/CLAUDE.md` |
| MCP サーバ | `backend/CLAUDE.md` の MCP 層 |
| frontend 全般（features 構成・UI・型） | `frontend/CLAUDE.md` |
| API 追加 | `.claude/skills/add-api-endpoint/SKILL.md` |
| 画面・feature 追加 | `.claude/skills/add-frontend-feature/SKILL.md` |
| テスト | `.claude/skills/write-tests/SKILL.md` |
| ドキュメント・ADR | `.claude/skills/write-docs/SKILL.md` |
| 本番の不具合の切り分け | `.claude/skills/debug-production/SKILL.md` |
| 本番反映（`/deploy` 明示時のみ） | `.claude/skills/deploy/SKILL.md` |
| 「なぜこの設計か」の確認 | `docs-public/decisions.md`（分野別索引から読む） |
| 全体構成・公開資料の入口 | `docs-public/architecture.md` / `docs-public/README.md` |
| 認証・Google連携・MCP認可 | `docs-public/google-authentication.md` |

`docs/` は Git 管理外の個人メモ（作業ログ・トラブル事例）。**`git add` しない**。

## 絶対的な制約

- **既存アーキテクチャを許可なく変更しない**（リファクタリング依頼時を除く）
- **ライブラリの追加・削除・バージョン変更は事前確認**
- **DB スキーマ変更・新規マイグレーションは事前確認**
- **`@ts-expect-error` / `any` 禁止**。型エラーは正当な修正で解決する
- **仕様外の「ついでの」修正をしない**。変更範囲は最小に保つ
- `.env` / `.env.*` の中身を読まない・書かない・コミットしない
- `docker-compose.production.yml` と `nginx/conf.d/` は本番構成。**触る前に確認を取る**
- マジックナンバーは定数化する
- **コメントは最小限にする**（→ 下の「コメントとドキュメント」）

## 進め方

- **コードを書く前に対象ファイルの現状を読む**
- テストは通すために緩めない。「仕様変更」か「実装のバグ」かを切り分ける
- 大きな変更は**切り戻せる粒度**でコミットを分ける
- こだわりが**実態**（10〜20名 / 1GB VM / PWA）に見合うかを常に問う

### どこまで自律的に進めるか

**既定は main への push まで自律的に行う。** 逐一の確認を求めない。

手を止めて確認を求めるのは次の場合だけ。

- **利用者が判断すべき仕様の選択**が生じたとき（挙動・UI・命名の方針など）
- **「絶対的な制約」に触れるとき**（スキーマ変更、ライブラリ追加、本番構成の変更）
- **問題が起きたとき**（テストが落ちる、原因不明の失敗、想定と違う既存実装）
- **不可逆な操作**（履歴の書き換え、force push、本番データの変更、削除）

止まるときは、何が起きて何を判断してほしいのかを添える。
それ以外は、テストを通し、コミットを分け、push まで済ませてから報告する。

## コメントとドキュメント

**コードのコメントは最小限にし、詳細はドキュメントへ書く。**
長い説明をコードに埋めると、実装を変えたときに一緒に腐る。

- コメントは「何を」ではなく**「なぜ」**を、**1〜2行で**書く
- 背景・代替案・トレードオフはコメントに書かず、ADR に書いて `（ADR #18）` と参照する
- 経緯をコードに書き残さない（「以前は〜だった」は Git 履歴が持っている）
- docstring は1行を基本とし、非自明な前提があるときだけ数行に伸ばす

**実装はドキュメントまで含めて完了。** コードとテストが通っただけで終わりにしない。
特に、機能を足したら**「未実装」「できない」と書いていた記述が嘘になっていないか**を確認する
（`docs-public/` の「今後の課題」、過去の ADR、MCP ツールの description）。手順は `write-docs` Skill。

置き場所は読者で決める。**public 公開リポジトリ**であることに注意する。

| | 内容 |
|---|---|
| `docs-public/`（追跡） | 仕様・**設計判断とその理由**・API・制約 |
| `docs/`（管理外） | 失敗した操作・詰まった過程・環境固有の値 |

**実ドメイン・VM名・秘密値はどちらにも書かない。** 実装で設計判断をしたら ADR を足す。

## コマンド

```bash
docker compose up -d                    # db + backend + mcp + frontend
docker compose logs -f backend          # mcp は localhost:8001/mcp

# backend テスト（PostgreSQL 必須。SQLite では pg_trgm が動かない）
docker compose up -d db
cd backend && venv/Scripts/python.exe -m pytest -q   # Windows（Linux: python -m pytest -q）

# frontend
cd frontend
npx tsc --noEmit        # 型チェック
npm run lint           # TypeScript・React Hooks 等の検査
npm run test:run && npm run build
```

開発 Compose の `backend` は起動時に `migrate` と `load_standard_foods` を自動実行する。
本番では自動実行しない。反映順序は `docs-public/operations.md` を参照。

## 言語とコミット

対話・コミットメッセージ・docstring・コメントは**日本語**。識別子は英語。

`feat(settings): 目標値の編集に対応`
type は `feat` / `fix` / `refactor` / `docs` / `chore` / `test`。

- **`Co-Authored-By` を付けない。** AI 支援ツール名も書かない
- **簡潔に書く。** 本文は**2〜5行の散文**。箇条書きで変更点を列挙しない
- 本文に書くのは「なぜそうしたか」と「何を変えていないか」。
  変更内容そのものは diff が持っているので繰り返さない
- 1行で足りるなら本文を書かない

```
feat(analysis): 分析ページに家計簿ふうの罫線背景を適用

「今日の目標達成状況」カードに方眼の罫線背景（.bg-ledger）を追加。
Cardコンポーネント自体やrechartsを使う各グラフの実装は変更していない（ADR #21）。
```
