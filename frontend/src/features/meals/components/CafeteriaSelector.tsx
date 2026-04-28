/**
 * CafeteriaSelector — 食堂メニュー選択コンポーネント（Tailwind + shadcn/ui版）
 *
 * Phase 3: Bootstrap Card/Badge/Button → Tailwind + shadcn/ui。
 * 食堂メニュー一覧取得 → カテゴリフィルタ → クリックでメニュー選択。
 */
import { useState, useEffect, useMemo } from "react";
import { Store, Plus, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { mealApi } from "../api/mealApi";
import type { CafeteriaMenu, FoodSelectionItem } from "@/types";

interface CafeteriaSelectorProps {
  onMenuSelected: (item: FoodSelectionItem) => void;
}

/** カテゴリフィルタのタブ定義 */
const CATEGORIES = [
  { value: "", label: "すべて" },
  { value: "main", label: "主菜" },
  { value: "side", label: "副菜" },
  { value: "soup", label: "汁物" },
  { value: "rice", label: "ごはん" },
  { value: "noodle", label: "麺類" },
  { value: "set", label: "セット" },
] as const;

export default function CafeteriaSelector({
  onMenuSelected,
}: CafeteriaSelectorProps) {
  const [menus, setMenus] = useState<CafeteriaMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchMenus = async () => {
      setLoading(true);
      try {
        const data = await mealApi.getCafeteriaMenus();
        setMenus(data as CafeteriaMenu[]);
      } catch {
        setError("食堂メニューの取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    };
    fetchMenus();
  }, []);

  const filteredMenus = useMemo(() => {
    let filtered = menus;
    if (selectedCategory) {
      filtered = filtered.filter((m) => m.category === selectedCategory);
    }
    if (searchQuery) {
      filtered = filtered.filter((m) =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  }, [menus, selectedCategory, searchQuery]);

  const handleSelect = (menu: CafeteriaMenu) => {
    onMenuSelected({
      item_type: "cafeteria",
      item_id: menu.id,
      item_name: menu.name,
      menu_id: menu.id,
      amount_grams: 100,
      calories: menu.calories,
      protein: menu.protein,
      fat: menu.fat,
      carbohydrates: menu.carbohydrates,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        読み込み中...
      </div>
    );
  }

  if (error) {
    return <p className="py-4 text-center text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="space-y-3">
      <h6 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Store className="h-4 w-4" />
        食堂メニュー
      </h6>

      {/* 検索 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="メニュー名で検索..."
          className="h-8 pl-9 text-sm"
        />
      </div>

      {/* カテゴリフィルタ */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setSelectedCategory(cat.value)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              selectedCategory === cat.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* メニューリスト */}
      {filteredMenus.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          該当するメニューはありません。
        </p>
      ) : (
        <div className="max-h-[400px] space-y-2 overflow-y-auto">
          {filteredMenus.map((menu) => (
            <div
              key={menu.id}
              className="flex cursor-pointer items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-secondary/30"
              onClick={() => handleSelect(menu)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleSelect(menu)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">
                    {menu.name}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {menu.category_display}
                  </Badge>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  <span className="mr-2 font-bold text-foreground">
                    {menu.calories}kcal
                  </span>
                  <span>
                    P:{menu.protein}g / F:{menu.fat}g / C:{menu.carbohydrates}g
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary text-primary hover:bg-primary/10"
                aria-label={`${menu.name}を追加`}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
