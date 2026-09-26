# Googleログイン・アカウント連携

Google Identity Services（GIS）による認証と、既存 DishBoard アカウントとの連携の仕様。
**なぜこの構成なのか**を、将来の保守担当者が判断できる粒度で残す。

関連: [ドキュメント一覧](README.md) / [decisions.md](decisions.md) の ADR #22〜#27・#29・#32 / [アーキテクチャ](architecture.md)

---

## 1. 認証と認可は別の機能である

この2つを混同すると設計を誤るため、最初に整理する。

| 登場人物 | 責務 | 発行するもの |
|---|---|---|
| Google Identity Services | DishBoard を操作しているのが**誰か**を確認する | Google ID トークン |
| DishBoard 認可サーバ | Claude に**どの MCP スコープを許すか**決める | DishBoard の access token |
| DishBoard MCP サーバ | DishBoard が発行した token を検証しツールを実行する | — |

**Google のアクセストークンを MCP の Bearer token として使わない。**
Google のトークンは Google サービス向けであり、DishBoard の resource / scope / 失効方針とは
別物である。Claude 向けのトークンは django-oauth-toolkit が発行する（ADR #22〜#23）。

---

## 2. 機能

| 機能 | 挙動 |
|---|---|
| 新規 Google ログイン | 未登録 subject かつ同一メールの既存ユーザーが居なければ、`User` / `GoogleAccount` / DRF Token を作る |
| 連携済みでのログイン | subject から `GoogleAccount.user` を解決する |
| 既存アカウントへの連携 | 従来ログイン後、設定画面から**明示的に**連携する |
| 連携解除 | 利用可能なパスワードを持つユーザーのみ可能 |
| MCP 認可画面でのログイン | Claude の OAuth 認可画面でも Google でログインできる |

既存の `/api/login/` `/api/register/` `/api/logout/` と DRF Token 認証は変更していない。
Google ログインも同じ DRF Token を返すため、ログイン後の画面・API クライアントに影響しない。

---

## 3. データモデル

`GoogleAccount` は Django `User` と一対一。

| フィールド | 用途 |
|---|---|
| `user` | DishBoard ユーザー（OneToOne） |
| `subject` | Google の不変識別子。**unique** |
| `email` | 表示・監査用 |
| `linked_at` | 連携日時 |

**識別子は `subject`。メールアドレスは使わない。**
メールは変更されうるため、ログイン先の決定に使うとアカウントの同一性が保てない。
`email` の用途は表示・自動連携を防ぐための既存ユーザー検出・運用確認に限る。

---

## 4. ID トークンの検証

frontend から backend へ送るのは GIS が返した `credential` **だけ**である。
frontend が指定できるメール・表示名・subject・ユーザーIDは、認証判断に一切使わない。

backend は Google の tokeninfo へ問い合わせ、返った claim を検査する。

- `aud` が `GOOGLE_CLIENT_ID` と一致する
- `iss` が Google の issuer である
- `email_verified` が true である
- `sub` と `email` が存在する

**Google へ到達できない場合は認証を拒否する（fail closed）。**
タイムアウト・DNS障害・HTTPエラー・不正なJSONは、すべて検証失敗として扱う。
Google 障害時にログインできなくなるが、不正な credential を誤って受け入れるよりは安全であり、
従来のパスワードログインが代替経路として残る。

---

## 5. API

### `POST /api/auth/google/`

```json
{ "credential": "<GIS ID token>" }
```

| 条件 | 応答 |
|---|---|
| subject が連携済み | 200。対応ユーザーの DRF Token |
| 未連携・同一メールの既存ユーザーなし | 200。ユーザーと `GoogleAccount` を作成し DRF Token |
| 未連携・同一メールの既存ユーザーあり | **409**。`link_required: true` を返し、自動連携しない |

### `POST /api/auth/google/link/`

DRF Token 認証必須。検証済み subject をログイン中のユーザーへ連携する。
次のいずれかなら **409** を返し、上書きしない。

- その subject が既に別ユーザーへ連携済み
- そのユーザーが既に別の subject を連携済み

### `DELETE /api/auth/google/link/`

連携を解除する。**利用可能なパスワードを持たないユーザーは解除できない**
（唯一のログイン手段を失うため）。UI 側でも解除ボタンを出さない。

### `POST /accounts/google/`（MCP 認可画面用）

Google credential から Django セッションを作る。詳細は §6。

---

## 6. MCP OAuth 認可画面との統合

PWA と OAuth 認可画面では**認証方式が異なる**。

| | 認証方式 |
|---|---|
| React PWA | DRF Token |
| OAuth 認可画面（django-oauth-toolkit） | Django セッション |

PWA 用の API は DRF Token を返すだけで認可画面のログイン状態にならない。
そこで認可画面専用の Google セッションログイン View を分けた。

```
OAuth 認可フロー → Django ログイン画面 → Google credential を POST
  → backend で検証 → login() でセッション作成 → 元の認可 URL へ戻る
```

戻り先の `next` は `url_has_allowed_host_and_scheme()` で**同一ホストの安全な URL だけ**許可する。
不正・空なら認可エンドポイントへフォールバックし、オープンリダイレクトを防ぐ。

認可画面は PWA とは**別サブドメイン**で配信している（ADR #26）ため、
Google Cloud Console の「承認済み JavaScript 生成元」には**両方のオリジン**を登録する
（パス・末尾スラッシュ無し）。

### ログイン画面の COOP（→ ADR #32）

Google のログインはポップアップで認証し、結果を元の画面へ渡す。
Django の `SecurityMiddleware` が既定で付ける `Cross-Origin-Opener-Policy: same-origin` は
この受け渡しを遮断するため、**ログイン画面のレスポンスだけ** `same-origin-allow-popups` にしている。

設定は `DishBoardLoginView.render_to_response()` にあり、`settings` は既定のまま触っていない。
`SecurityMiddleware` は `setdefault()` で値を入れるので、View 側の指定が優先される。

**この設定を外すと、Google のアカウント選択までは進むのに `POST /accounts/google/` が発生しなくなる。**
ユーザー名・パスワードのログインは成功したままなので、Google 連携の設定ミスに見えるが別物である。

| 経路 | COOP |
|---|---|
| `GET`/`POST /accounts/login/` | `same-origin-allow-popups` |
| それ以外（`/o/authorize/` `/api/` `/admin/` …） | `same-origin` |

---

## 7. セキュリティ上の設計判断

### 7-1. 既存メールへ自動連携しない（→ ADR #27）

同じメールの既存ユーザーを検索して自動連携する実装は簡単に見える。しかし既存ユーザーのメールは
**入力ミスの可能性があり、所有確認もしていない**。Google 側で確認済みでも同一人物とは限らない。
将来プロバイダーを追加したとき、メール一致だけの連携はアカウント奪取の経路になりうる。
よって既存ユーザーには**従来ログイン後の明示的な連携**を求める。

### 7-2. subject を移動・上書きしない

別ユーザーへ連携済みの subject を移さない。既に連携済みのユーザーへ別の subject を暗黙に上書きしない。
アカウント変更が必要になったら、再認証と監査ログを含む別仕様として設計する。

### 7-3. Google 専用ユーザーには利用不能パスワードを設定する

`set_unusable_password()` を使う。ランダムなパスワードだと
「存在するが誰も知らない」状態になり、通常ログイン経路の扱いが曖昧になる。

### 7-4. 秘匿情報と健康情報をログへ出さない

ログ収集サービスや共有端末からの漏洩を防ぐため、次を書かない。

credential / ID トークン / Authorization ヘッダ / DRF Token / OAuth token / Cookie /
体重 / 食事内容 / OCR 画像 / OCR 抽出結果

---

## 8. 設定

| 変数 | 用途 |
|---|---|
| `GOOGLE_CLIENT_ID` | backend の audience 検証 |
| `VITE_GOOGLE_CLIENT_ID` | frontend のボタン初期化。**同じ値**にする |

client ID は秘密情報ではないが、値がずれると必ず失敗する。
未設定なら Google ボタンを表示せず、従来ログインだけで動作する。

`GOOGLE_CLIENT_SECRET` は使わない（frontend へ埋め込んではならない）。
MCP の OAuth クライアントは Claude が動的登録（DCR）するため、固定の client_id / secret も持たない。

> **`VITE_` 変数はビルド時に埋め込まれる。** 本番で値を変えたら、frontend の成果物を同梱する `nginx` イメージの再ビルドが必要。
> `.env` を書き換えて再起動するだけでは反映されない。

---

## 9. テスト方針

Google へは実際に通信せず、`requests.get` をモックして tokeninfo の claim を再現する。
外部サービスの稼働状況に依存せず、**アプリ側の判断ロジック**を検証するため。

検証している分岐: 正常ログイン / 新規作成 / 連携済みの解決 / 同一メールの自動連携拒否 /
audience 不一致 / issuer 不一致 / 未確認メール / 別ユーザー連携済み subject の拒否 /
別アカウントによる上書き拒否 / 連携解除 / Google 専用ユーザーの解除拒否 /
セッションログイン / 不正な `next` の拒否

COOP はヘッダを付けるのが View、既定値を入れるのが middleware なので、
**middleware を通る Django のテストクライアント**で最終レスポンスを検証する
（ログイン画面 / ログイン失敗時の再表示 / それ以外の画面の3件）。

---

## 10. 既知の制約

| 制約 | 内容 |
|---|---|
| tokeninfo への外部依存 | ログインのたびに Google へ通信する。Google 障害時はログイン不可 |
| パスワード設定機能がない | Google 専用ユーザーは後からパスワードを設定できず、Google アカウント喪失時は管理者対応が必要 |
| 複数 Google アカウント不可 | OneToOne 設計のため 1 ユーザー 1 アカウント |
| メール変更の同期方針が未定 | Google 側でメールが変わったときの `GoogleAccount.email` の更新方針を決めていない |

## 11. 今後の候補

**優先度: 高**

- **ID トークンのローカル検証**。Google 公開鍵をキャッシュし、毎回の外部通信をなくす。
  鍵ローテーション・`exp`/`iat`・clock skew の扱いを設計する必要がある
- **OAuth のレート制限**。token endpoint / DCR / 認可用セッションログインの制限を検討する。
  Web API の従来ログイン・登録・Google ログイン/連携には ScopedRateThrottle を導入済み（ADR #29）
- **監査ログ**。連携・解除・ログイン成否・拒否理由を、credential や token を含めず記録する

**優先度: 中**

- Google 専用ユーザーのパスワード設定（設定後は連携解除も許可できる）
- 連携解除・アカウント変更前の再認証
- MCP 接続管理（認可済みクライアントの一覧・失効）
- DCR で作られた未使用 Application の定期整理

**優先度: 低**

- 他プロバイダー（Microsoft Entra ID / GitHub / 大学の OIDC）。
  追加時もメール一致による自動連携は行わず、**プロバイダー名 + subject** を識別子にする
- 複数 Google アカウント対応（OneToOne 設計とUIの見直しを伴う）

---

## 12. ロールバック時の注意

今回の DB 変更は `GoogleAccount` テーブルの**追加のみ**で、既存の食事・体重テーブルは変更していない。
そのため緊急時は、**テーブルを残したままアプリだけ旧コードへ戻す**方が安全である。

`migrate record_app 0009` を安易に実行しないこと。実行すると連携情報が失われる。

---

## 13. 同時に修正した不具合

Google ログイン実装時のコードリーディングで見つかり、同じ変更に含めたもの。

- **`toISOString()` による日付ずれ。** UTC 変換のため日本時間の深夜に前日へずれうる。
  ローカル日付を組み立てる共通関数（`@/lib/date`）へ置き換えた
- **記録画面の見出しが過去日でも「今日の献立」だった。** 選択日で出し分けるようにした
- **axios の既定 URL が旧環境（CloudFront）に固定されていた。** 環境変数の設定漏れで
  別環境へデータを送りうるため、同一オリジンの `/api/` を既定値にした
- **OCR の例外文字列を利用者へそのまま返していた。** 内部パスや SDK の詳細を含みうるため
  固定メッセージに変え、詳細はサーバログのみに記録するようにした
- **OCR ログにユーザー名と栄養情報を出力していた**（§7-4 違反）。削除した
- 新規環境で `backend/logs/` が無く Django 初期化前に失敗する問題、`.env` 不在時の
  `SECRET_KEY` 空問題、SQLite で PostgreSQL 固有の `SIMILARITY` を呼びテストが落ちる問題を修正。
  **本番 PostgreSQL の検索仕様は変更していない**

---

## 14. 保守上の原則

- メールではなく **subject** でアカウントを識別する
- 既存メールへ自動連携しない / 他ユーザーの subject を移動しない
- 唯一のログイン手段を解除させない
- credential・token・健康情報をログへ出さない
- backend と frontend の client ID を一致させる
- **OAuth の issuer と MCP の resource を混同しない**
- **COOP の緩和をログイン画面の外へ広げない**（→ ADR #32）
- `VITE_` 変数を変えたら frontend を再ビルドする
- マイグレーション前にバックアップを取る
