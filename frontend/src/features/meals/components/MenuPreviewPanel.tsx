/**
 * MenuPreviewPanel — メニュービルダー右パネル
 *
 * 現在のメニューリスト + 合計栄養素 + 保存オプション。
 */
import {
  ListOrdered,
  Trash2,
  BarChart3,
  Check,
  Loader2,
  ShoppingBasket,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import NutritionSummary from "./NutritionSummary";
import CurrentMenuDisplay from "./CurrentMenuDisplay";
import type { MenuBuilderReturn } from "../hooks/useMenuBuilder";

interface MenuPreviewPanelProps {
  menuBuilder: MenuBuilderReturn;
}

export default function MenuPreviewPanel({ menuBuilder }: MenuPreviewPanelProps) {
  const {
    menuItems,
    totalNutrition,
    saveAsMenu,
    setSaveAsMenu,
    menuName,
    setMenuName,
    menuDescription,
    setMenuDescription,
    handleSubmit,
    handleClearMenu,
    isSubmitting,
  } = menuBuilder;

  return (
    <div className="space-y-3">
      {/* 現在のメニューリスト */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ListOrdered className="h-4 w-4" />
            現在のメニュー
            <Badge variant="secondary" className="text-xs">
              {menuItems.length}
            </Badge>
          </CardTitle>
          {menuItems.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearMenu}
              className="h-7 px-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="max-h-[350px] overflow-y-auto p-0">
          {menuItems.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <ShoppingBasket className="mb-2 h-10 w-10" />
              <p className="text-sm">左のパネルから</p>
              <p className="text-sm">アイテムを追加してください</p>
            </div>
          ) : (
            <CurrentMenuDisplay menuBuilder={menuBuilder} />
          )}
        </CardContent>
      </Card>

      {/* 合計栄養素 */}
      <Card>
        <CardHeader className="bg-primary/10 py-2">
          <CardTitle className="flex items-center gap-2 text-xs">
            <BarChart3 className="h-3.5 w-3.5" />
            合計栄養素
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <NutritionSummary nutrition={totalNutrition} simple />
        </CardContent>
      </Card>

      {/* 保存オプション */}
      <Card className="border-primary/50">
        <CardContent className="pt-4">
          {/* Myメニュー保存チェック */}
          <label className="mb-3 flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={saveAsMenu}
              onChange={(e) => setSaveAsMenu(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <span className="text-sm font-bold text-primary">
              Myメニューとして保存する
            </span>
          </label>

          {/* Myメニュー名・説明（チェック時のみ表示） */}
          {saveAsMenu && (
            <div className="mb-3 space-y-2 rounded-md border border-border bg-secondary/30 p-3">
              <div className="space-y-1">
                <Label className="text-xs">
                  メニュー名 <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={menuName}
                  onChange={(e) => setMenuName(e.target.value)}
                  placeholder="例: 定番朝食セット"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">説明</Label>
                <Textarea
                  value={menuDescription}
                  onChange={(e) => setMenuDescription(e.target.value)}
                  placeholder="メモ..."
                  rows={2}
                  className="text-sm"
                />
              </div>
            </div>
          )}

          {/* 登録ボタン */}
          <Button
            className="w-full font-bold"
            onClick={handleSubmit}
            disabled={menuItems.length === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                食事記録として登録
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
