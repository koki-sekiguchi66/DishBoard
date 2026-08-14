import React, { useState, useEffect } from 'react';
import { Loader2, UtensilsCrossed, Plus, Pencil, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { CustomFood, FoodSelectionItem } from '@/types';
import { mealApi } from '../api/mealApi';
import { customFoodApi } from '@/features/customFoods/api/customFoodApi';
import CustomFoodFormModal from '@/features/customFoods/components/CustomFoodFormModal';
import { EditCustomFoodModal } from '@/features/customFoods';

const MyItemsSelector = ({ onItemSelected }: { onItemSelected: (item: FoodSelectionItem) => void }) => {
  const [items, setItems] = useState<CustomFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CustomFood | null>(null);

  const fetchCustomFoods = async () => {
    setLoading(true);
    try {
      const data = await mealApi.getCustomFoods();
      setItems(data as CustomFood[]);
    } catch (err) {
      console.error(err);
      setError('Myアイテムの取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomFoods();
  }, []);

  const handleDelete = async (e: React.MouseEvent, item: CustomFood) => {
    e.stopPropagation();
    if (!window.confirm(`「${item.name}」を削除してもよろしいですか？`)) return;

    try {
      await customFoodApi.deleteCustomFood(item.id);
      toast.success('削除しました');
      fetchCustomFoods();
    } catch (err) {
      console.error(err);
      toast.error('削除に失敗しました');
    }
  };

  const handleEdit = (e: React.MouseEvent, item: CustomFood) => {
    e.stopPropagation();
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleSuccess = () => {
    fetchCustomFoods();
  };

  if (loading) return (
    <div className="text-center p-3">
      <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
      読み込み中...
    </div>
  );
  if (error) return (
    <Alert variant="destructive">
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );

  return (
    <>
      <div className="flex justify-between items-center mb-3">
        <h6 className="m-0 flex items-center gap-2">
          <UtensilsCrossed className="h-4 w-4" />
          Myアイテム一覧
        </h6>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="h-4 w-4 mr-1" />新規作成
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center text-muted-foreground p-3 bg-muted rounded">
          登録されたMyアイテムはありません。<br />
          「新規作成」から追加してください。
        </div>
      ) : (
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex justify-between items-center px-2 py-2 cursor-pointer hover:bg-muted"
                onClick={() => onItemSelected({
                  ...item,
                  item_name: item.name,
                  item_type: 'custom',
                  amount: 100
                })}
              >
                <div className="flex-1">
                  <div className="font-bold text-primary">{item.name}</div>
                  <small className="text-muted-foreground">
                    {item.calories_per_100g}kcal <span className="mx-1">|</span>
                    P:{item.protein_per_100g}g
                  </small>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="mr-2">メニューに追加</Badge>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground border-0"
                      title="編集"
                      onClick={(e) => handleEdit(e, item)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive border-0"
                      title="削除"
                      onClick={(e) => handleDelete(e, item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 新規作成モーダル */}
      {showCreateModal && (
        <CustomFoodFormModal
          show={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onFoodCreated={handleSuccess}
        />
      )}

      {/* 編集モーダル */}
      {showEditModal && selectedItem && (
        <EditCustomFoodModal
          show={showEditModal}
          food={selectedItem}
          onClose={() => setShowEditModal(false)}
          onFoodUpdated={handleSuccess}
        />
      )}
    </>
  );
};

export default MyItemsSelector;
