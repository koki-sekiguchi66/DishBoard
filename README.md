# DishBoard

食事と体重を記録して栄養管理を行う PWA。研究室のメンバー10〜20名が日常的に使う実用ツールとして運用している。
Django + DRF + PostgreSQL / React + TypeScript / GCP 上の Docker Compose。

- **[ARCHITECTURE.md](ARCHITECTURE.md)** — システム構成・データモデル・処理フロー（まずここを読む）
- **[docs-public/decisions.md](docs-public/decisions.md)** — 主要な設計判断を「決定 / 背景 / 代替案 / 理由 / トレードオフ」で記録
- **[docs-public/ui-design-proposal.md](docs-public/ui-design-proposal.md)** — UIデザイン刷新の検討過程（決定は decisions.md #21）

---

**開発ログ**

Phase 1: 基本設計とバックエンド基盤の構築 (2025年7月中旬)

- 技術選定:

バックエンドには、迅速な開発と堅牢性を両立できるPythonのDjangoフレームワーク、及びAPI開発を効率化するDjango REST Frameworkを選定。フロントエンドには、コンポーネントベースの開発でUI/UXを柔軟に構築できるReactを採用する方針を固めた。

- データベース設計:
    
    アプリケーションの中核となる食事記録 (MealRecord)、体重記録 (WeightRecord) モデルを設計。Django標準のUserモデルと関連付け、ユーザーごとのデータ管理の基盤を構築した。
    
- 環境構築:
    
    Python仮想環境 (venv) を設定し、プロジェクトの依存関係を分離。APIキーなどの秘匿情報はpython-dotenvを用いて.envファイルで管理し、セキュリティを確保した。
    

Phase 2: コアAPIの実装と認証システムの導入 (2025年7月中旬)

- CRUD APIの実装:
    
    ModelViewSetとModelSerializerを活用し、食事記録と体重記録に対する基本的なCRUD (作成・読み取り・更新・削除) APIを実装。
    
- 認証機能の実装:
    
    ステートレスなReactフロントエンドとの連携を容易にするため、DRFのトークン認証 (TokenAuthentication) を採用。パスワードのハッシュ化を自動で行うUser.objects.create_userを用いたユーザー登録API、及び認証トークンを発行するログインAPIを構築した。
    
- アクセス制御の実装:
    
    全てのAPIエンドポイントにIsAuthenticatedパーミッションを設定。さらに、get_querysetメソッドをオーバーライドしてリクエストユーザーでデータをフィルタリングすることで、ユーザー間でデータが完全に分離されている状態を保証し、セキュリティを強化した。
    

Phase 3: フロントエンド環境構築とAPI連携 (2025年7月下旬)

- フロントエンド基盤構築:
    
    モダンな開発環境であるViteを用いてReact開発環境を構築。
    
- APIクライアントの設定:
    
    API通信ライブラリとしてaxiosを導入。localStorageに保存された認証トークンを、全てのリクエストヘッダーに自動で付与するaxiosインターセプターを設定し、認証が必要なリクエストの管理を効率化した。
    
- 接続課題の解決:
    
    開発初期に発生したCORS (クロスオリジンリソース共有) エラーに対し、バックエンドのdjango-cors-headersライブラリの設定（許可するオリジン、ヘッダーの指定）を適切に行うことで解決した。
    

Phase 4: フロントエンドの主要機能実装 (2025年8月上旬)

- 認証フローの実装:
    
    ユーザー登録、ログイン、ログアウト機能を持つReactコンポーネントを作成。ログイン状態をlocalStorageのトークンの有無で管理し、認証状態に応じて表示コンポーネントを切り替える条件付きレンダリングを実装した。
    
- CRUDインターフェースの実装:
    
    ダッシュボード画面に、食事記録と体重記録の作成フォーム及び一覧表示機能を実装。記録の作成・更新・削除が実行された際に、ページをリロードすることなくUIが即座に更新されるよう、ReactのStateを適切に管理するロジックを構築した。


---

**開発環境**

```bash
docker compose up -d          # db / backend / frontend
```

環境変数は `backend/.env`（テンプレートは `.env.production.example`）。
規約と手順は `CLAUDE.md`（ルート / `backend/` / `frontend/`）と `.claude/skills/` に置いてある。

---

**デプロイ**

GCP e2-micro への構築・デプロイ手順は `.claude/skills/deploy/SKILL.md` に要点をまとめている
（詳細な構築ログ・設計判断の記録は Git 管理外の `docs/` に置いており、リポジトリには含めていない）。

要点:

- 実行環境: GCP Compute Engine e2-micro（Always Free / us-west1 等）+ Docker Compose
- 配信: VM 内 nginx で同一オリジン配信（フロント静的 + Django へのリバースプロキシ）
- DB: PostgreSQL 16 をコンテナ同居。**データ移行は行わず新規構築**（migrate → load_standard_foods → createsuperuser）
- HTTPS: DuckDNS + Let's Encrypt (certbot)
- OCR: Azure AI Vision (Read API) へ外部化。Redis / Celery は使用しない
- 週次スクレイピング: GitHub Actions cron → SSH → `manage.py update_cafeteria_menus`
