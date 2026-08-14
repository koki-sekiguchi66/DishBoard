import React, { useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Check, X, Pencil, Trash2 } from 'lucide-react';

interface MenuItem {
  item_name: string;
  amount_grams: number;
  calories: number;
  protein: number;
  fat: number;
  carbohydrates: number;
}

/** メニュー内の1アイテム。分量はクリックでインライン編集する。 */
const CurrentMenuItem = ({ item, index, onAmountChange, onRemove }: {
  item: MenuItem;
  index: number;
  onAmountChange: (amount: number) => void;
  onRemove: () => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [amount, setAmount] = useState(item.amount_grams);

  const handleSaveAmount = () => {
    if (amount > 0) {
      onAmountChange(amount);
      setIsEditing(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveAmount();
    }
  };

  return (
    <li className="flex justify-between items-start py-2 border-b border-border last:border-0">
      <div className="flex-1">
        {/* アイテム名 */}
        <div className="font-bold mb-1">
          {index + 1}. {item.item_name}
        </div>

        {/* 分量表示 / 編集 */}
        <div className="flex items-center gap-2 mb-1">
          {isEditing ? (
            <>
              <Input
                type="number"
                style={{ width: '80px' }}
                value={amount}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setAmount(Number(e.target.value))}
                onKeyPress={handleKeyPress}
                autoFocus
                className="h-7 text-sm"
              />
              <span className="text-muted-foreground">g</span>
              <Button
                size="sm"
                onClick={handleSaveAmount}
                className="h-7 w-7 p-0"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setAmount(item.amount_grams);
                  setIsEditing(false);
                }}
                className="h-7 w-7 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <span className="text-muted-foreground">分量:</span>
              <strong>{item.amount_grams}g</strong>
              <Button
                size="sm"
                variant="link"
                onClick={() => setIsEditing(true)}
                className="p-0 h-auto"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {/* 栄養情報（簡易版） */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            {item.calories.toFixed(0)} kcal
          </Badge>
          <Badge variant="secondary">
            P: {item.protein.toFixed(1)}g
          </Badge>
          <Badge variant="secondary">
            F: {item.fat.toFixed(1)}g
          </Badge>
          <Badge variant="secondary">
            C: {item.carbohydrates.toFixed(1)}g
          </Badge>
        </div>
      </div>

      {/* 削除ボタン */}
      <Button
        variant="destructive"
        size="sm"
        onClick={onRemove}
        className="ml-2"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );
};

export default CurrentMenuItem;
