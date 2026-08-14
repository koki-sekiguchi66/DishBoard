
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Bookmark, AlertTriangle, Info, Plus } from 'lucide-react';
import { customMenuApi } from '@/features/customMenus/api/customMenuApi';
import { toast } from 'sonner';
import type { CustomMenu } from '@/types';

/** 保存済みの Myメニューを一覧表示し、選択で全アイテムを読み込む。 */
const MyMenusSelector = ({ menuBuilder }: { menuBuilder: { loadFromCustomMenu: (menu: CustomMenu) => void } }) => {
  const [menus, setMenus] = useState<CustomMenu[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMenus = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await customMenuApi.getMenus();
        setMenus(data);
      } catch (err) {
        console.error('メニュー取得エラー:', err);
        setError('メニューの取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMenus();
  }, []);

  const handleSelectMenu = async (menuId: number) => {
    try {
      const menuDetail = await customMenuApi.getMenuDetail(menuId);
      menuBuilder.loadFromCustomMenu(menuDetail);
    } catch (err) {
      console.error('メニュー読み込みエラー:', err);
      toast.error('メニューの読み込みに失敗しました');
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" role="status" />
        <span className="sr-only">読み込み中...</span>
        <p className="text-muted-foreground mt-2">メニューを読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (menus.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          保存されたメニューがありません。メニューを作成して保存してください。
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      <h6 className="mb-3 flex items-center gap-2">
        <Bookmark className="h-4 w-4" />
        保存済みメニュー ({menus.length}件)
      </h6>

      <ul className="divide-y divide-border">
        {menus.map((menu) => (
          <li
            key={menu.id}
            className="flex justify-between items-start py-3"
          >
            <div className="flex-1">
              <div className="font-bold mb-1">{menu.name}</div>

              {menu.description && (
                <p className="text-muted-foreground text-sm mb-2">{menu.description}</p>
              )}

              <div className="flex flex-wrap gap-2 mb-2">
                <Badge variant="secondary">
                  {menu.total_calories.toFixed(0)} kcal
                </Badge>
                <Badge variant="secondary">
                  P: {menu.total_protein.toFixed(1)}g
                </Badge>
                <Badge variant="secondary">
                  F: {menu.total_fat.toFixed(1)}g
                </Badge>
                <Badge variant="secondary">
                  C: {menu.total_carbohydrates.toFixed(1)}g
                </Badge>
              </div>

              <small className="text-muted-foreground">
                {menu.items_count}個のアイテム
              </small>
            </div>

            <Button
              size="sm"
              onClick={() => handleSelectMenu(menu.id)}
              className="ml-2"
            >
              <Plus className="h-4 w-4 mr-1" />
              読み込む
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MyMenusSelector;
