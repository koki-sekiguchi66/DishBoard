/**
 * FoodSearchInput — 食品検索 + 分量選択コンポーネント
 *
 * 2段階フロー:
 *   1. 検索モード: テキスト入力 → デバウンス検索 → 結果リスト表示
 *   2. 分量選択モード: 食品選択後に分量入力 → API栄養計算 → 追加
 */
import { useState, useEffect } from "react";
import { Search, CheckCircle, Loader2, Plus, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { mealApi } from "../api/mealApi";
import type { StandardFood, FoodSelectionItem } from "@/types";

interface FoodSearchInputProps {
  onFoodSelected: (item: FoodSelectionItem) => void;
}

export default function FoodSearchInput({ onFoodSelected }: FoodSearchInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StandardFood[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFood, setSelectedFood] = useState<StandardFood | null>(null);
  const [amount, setAmount] = useState(100);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setError("");
      return;
    }
    if (selectedFood) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await mealApi.searchFoods(query);
        setResults(response.foods || []);
        if (response.foods && response.foods.length === 0) {
          setError("該当する食品が見つかりませんでした。");
        }
      } catch {
        setResults([]);
        setError("検索中にエラーが発生しました。");
      }
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [query, selectedFood]);

  const handleFoodSelect = (food: StandardFood) => {
    setSelectedFood(food);
    setQuery("");
    setResults([]);
    setAmount(100);
    setError("");
  };

  const handleConfirmAdd = async () => {
    if (!selectedFood) return;
    setCalculating(true);
    try {
      const response = await mealApi.calculateNutrition(selectedFood.id, amount);
      onFoodSelected({
        item_type: "standard",
        item_id: selectedFood.id,
        item_name: selectedFood.name,
        amount_grams: amount,
        ...response.nutrition,
      });
      handleCancel();
    } catch {
      setError("栄養素の計算に失敗しました");
    } finally {
      setCalculating(false);
    }
  };

  const handleCancel = () => {
    setSelectedFood(null);
    setAmount(100);
    setQuery("");
    setResults([]);
    setError("");
  };

  return (
    <div className="relative">
      {/* 1. 検索モード */}
      {!selectedFood && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="食品名を入力... (例: 白米)"
              className="pl-10"
              autoComplete="off"
            />
          </div>

          {loading && (
            <p className="flex items-center gap-2 text-sm text-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              検索中...
            </p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {results.length > 0 && (
            <div className="max-h-[300px] overflow-y-auto rounded-lg border border-border">
              {results.map((food) => (
                <button
                  key={food.id}
                  type="button"
                  className="flex w-full items-center justify-between border-b border-border p-3 text-left transition-colors last:border-b-0 hover:bg-secondary/50"
                  onClick={() => handleFoodSelect(food)}
                >
                  <div>
                    <p className="text-sm font-bold text-foreground">{food.name}</p>
                    <p className="text-xs text-muted-foreground">{food.category}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{food.nutrition.calories}kcal / 100g</p>
                    <p>P:{food.nutrition.protein}g</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. 分量選択モード */}
      {selectedFood && (
        <Card className="border-primary">
          <CardHeader className="bg-primary/10 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-primary" />
                選択中: {selectedFood.name}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                選び直す
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-medium">摂取量 (g)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="1"
                  />
                  <span className="text-sm text-muted-foreground">g</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="rounded-md border border-border bg-secondary/30 p-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">概算カロリー:</span>
                    <span className="font-bold">
                      {Math.round((selectedFood.nutrition.calories * amount) / 100)} kcal
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">タンパク質:</span>
                    <span>
                      {((selectedFood.nutrition.protein * amount) / 100).toFixed(1)} g
                    </span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleConfirmAdd}
                  disabled={amount <= 0 || calculating}
                >
                  {calculating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      計算中...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      この分量で追加
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
