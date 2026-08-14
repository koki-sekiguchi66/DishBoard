---
name: add-api-endpoint
description: DishBoard のバックエンドに新しい API エンドポイントを追加する手順。DRF の ViewSet / APIView / 関数ベース view の選び方、serializer の書き方、URL 登録、テストの追加までの型。「API を追加して」「エンドポイントを作って」「DRF で〜を返したい」といった依頼のときに使う。
---

# API エンドポイントの追加

## 0. 先に確認すること

- **DB スキーマの変更（新モデル・フィールド追加）が必要か**。必要なら着手前にユーザーの確認を取る
- 既存の似たエンドポイントを1つ読む。`record_app/views.py` と `record_app/serializers.py` の該当箇所

## 1. どの形で作るか決める

| 形 | 使う場面 | 例 |
|---|---|---|
| `ModelViewSet` | 1モデルの CRUD | `MealRecordViewSet` / `CustomFoodViewSet` |
| ViewSet の `@action` | 既存リソースに対する追加操作 | `CustomMenuViewSet.create_meal_from_menu` |
| `@api_view` の関数 | リソースに紐付かない単発の処理 | `search_foods` / `daily_nutrition_summary` |
| `generics.*` / `APIView` | 認証まわりなど特殊なもの | `UserRegistrationView` / `LogoutView` |

迷ったら ViewSet か、その `@action` を優先する。

## 2. serializer

`record_app/serializers.py` に `ModelSerializer` を追加する。

- `fields` は明示列挙する（`'__all__'` は既存の `CustomMenuItemSerializer` にあるが、新規では列挙を優先）
- `read_only_fields` に `id` / `user` / `created_at` / `updated_at` を入れる
- **一覧用と詳細用を分ける**。一覧では明細を返さず、必要なら `items_count` のような集計だけ返す（`MealRecordListSerializer` が例）
- ネストした明細を書き込む場合は `create()` / `update()` を `@transaction.atomic` で実装し、`bulk_create` でまとめて作る。更新は「全消し→作り直し」（`MealRecordSerializer` が例）
- **栄養値は必ずスナップショットとして保存する**。`StandardFood` への FK を張らない（`backend/CLAUDE.md` 参照）

## 3. view

`record_app/views.py` に追加する。

```python
class XxxViewSet(viewsets.ModelViewSet):
    """Xxx の CRUD ViewSet。"""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # ★ 必ずユーザーで絞る。データ分離はここで担保している
        return Xxx.objects.filter(user=self.request.user).order_by('-updated_at')

    def get_serializer_class(self):
        return XxxListSerializer if self.action == 'list' else XxxSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
```

守ること:

- `permission_classes` を明示する（デフォルトは `IsAuthenticated`。公開するなら `AllowAny` を明示）
- `get_queryset()` で `filter(user=self.request.user)`
- 明細を持つモデルは `prefetch_related('items')`、一覧で明細不要なら `annotate(Count('items'))`
- **計算ロジックを view に書かない**。`business_logic/` か `services.py` へ
- 複数モデルにまたがる書き込みは `services.py` に置き `@transaction.atomic`

## 4. URL 登録

`record_app/urls.py`。ViewSet は router に、それ以外は `urlpatterns` に追加する。

```python
router.register(r'xxx', XxxViewSet, basename='xxx')
# または
path('xxx/yyy/', yyy_view, name='xxx-yyy'),
```

`basename` は `reverse()` とテストで使うので必ず付ける。

## 5. テスト（先に書く）

`record_app/tests/test_<機能>.py`。`docker compose up -d db` が必要。

最低限これらを書く:

- 認証なしで 401 になること
- **他ユーザーのデータが見えない/触れないこと**（`other_authenticated_client` フィクスチャを使う）
- 正常系のレスポンス構造
- バリデーションエラー（400）

```python
@pytest.mark.django_db
class TestXxxAPI:
    def test_他ユーザーのデータは取得できない(self, other_authenticated_client, xxx):
        response = other_authenticated_client.get(f'/api/xxx/{xxx.id}/')
        assert response.status_code == 404
```

フィクスチャは `conftest.py` にあるものを使う（`user` / `authenticated_client` / `other_authenticated_client` / `standard_foods` など）。足りなければ `conftest.py` に追加する。

## 6. 確認

```bash
cd backend && venv/Scripts/python.exe -m pytest -q
```

フロントから使う場合は、`frontend/src/features/<name>/api/` に呼び出しを足し、
レスポンスの型を `frontend/src/types/` に定義する（`add-frontend-feature` Skill 参照）。
