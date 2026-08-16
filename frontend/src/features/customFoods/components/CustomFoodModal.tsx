import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Bookmark, Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { customFoodApi } from '../api/customFoodApi';
import CustomFoodFormModal from './CustomFoodFormModal';
import EditCustomFoodModal from './EditCustomFoodModal';
import type { CustomFood } from '@/types';

const CustomFoodModal = ({ show, onClose, onFoodSelected }: {
  show: boolean;
  onClose: () => void;
  onFoodSelected: (food: CustomFood, amount: number) => void;
}) => {
  const [customFoods, setCustomFoods] = useState<CustomFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFood, setSelectedFood] = useState<CustomFood | null>(null);
  const [amount, setAmount] = useState(100);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFood, setEditingFood] = useState<CustomFood | null>(null);

  useEffect(() => {
    if (show) {
      fetchCustomFoods();
    }
  }, [show]);

  const fetchCustomFoods = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await customFoodApi.getCustomFoods();
      setCustomFoods(data || []);
    } catch (error: unknown) {
      const err = error as { message?: string };
      setError('Myアイテムの読み込みに失敗しました: ' + (err.message || ''));
      setCustomFoods([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFoodSelect = (food: CustomFood) => {
    setSelectedFood(food);
  };

  const handleAddToMeal = () => {
    if (selectedFood) {
      onFoodSelected(selectedFood, amount);
      onClose();
    }
  };

  const handleCreateFood = async () => {
    await fetchCustomFoods();
    setShowCreateModal(false);
  };

  const handleEditClick = (food: CustomFood) => {
    setEditingFood(food);
    setShowEditModal(true);
  };

  const handleUpdateFood = async () => {
    await fetchCustomFoods();
    setShowEditModal(false);
    setEditingFood(null);
  };

  const handleDeleteFood = async (food: CustomFood) => {
    try {
      await customFoodApi.deleteCustomFood(food.id);
      await fetchCustomFoods();
    } catch (error) {
      console.error('削除エラー:', error);
      setError('削除に失敗しました');
    }
  };

  return (
    <>
      <Dialog open={show} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              <span className="flex items-center gap-2">
                <Bookmark className="h-4 w-4" />
                Myアイテムから追加
              </span>
            </DialogTitle>
          </DialogHeader>

          <div>
            {error && (
              <Alert variant="destructive" className="mb-3">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                新規作成
              </Button>
            </div>

            {loading ? (
              <div className="text-center p-4">
                <Loader2 className="h-4 w-4 animate-spin text-primary mx-auto" role="status" />
                <span className="sr-only">Loading...</span>
              </div>
            ) : customFoods.length === 0 ? (
              <div className="text-center p-4">
                <Bookmark className="h-8 w-8 text-muted-foreground mx-auto" style={{ fontSize: '2rem' }} />
                <p className="mt-2 text-muted-foreground">Myアイテムがまだありません</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {customFoods.map((food) => (
                  <li
                    key={food.id}
                    className={`py-2 px-3 ${
                      selectedFood?.id === food.id ? 'bg-primary text-primary-foreground' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div
                        className="flex-1"
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleFoodSelect(food)}
                      >
                        <h6 className="mb-1">{food.name}</h6>
                        <div>
                          <Badge variant="secondary" className="mr-1">
                            {food.calories_per_100g}kcal/100g
                          </Badge>
                          <small className="text-muted-foreground">
                            P:{food.protein_per_100g}g F:{food.fat_per_100g}g C:{food.carbs_per_100g}g
                          </small>
                        </div>
                      </div>
                      <div className="flex gap-1 items-start ml-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(food);
                          }}
                          title="編集"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('このアイテムを削除してもよろしいですか？')) {
                              handleDeleteFood(food);
                            }
                          }}
                          title="削除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {selectedFood && (
              <div className="mt-3 space-y-2">
                <Label>分量</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  min="1"
                  max="1000"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button
              onClick={handleAddToMeal}
              disabled={!selectedFood}
            >
              追加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showCreateModal && (
        <CustomFoodFormModal
          show={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onFoodCreated={handleCreateFood}
        />
      )}

      {showEditModal && editingFood && (
        <EditCustomFoodModal
          show={showEditModal}
          food={editingFood}
          onClose={() => {
            setShowEditModal(false);
            setEditingFood(null);
          }}
          onFoodUpdated={handleUpdateFood}
        />
      )}
    </>
  );
};

export default CustomFoodModal;
