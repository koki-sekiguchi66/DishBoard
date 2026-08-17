/**
 * SaveAsCustomFoodModal — 食事記録の品目1件をMyアイテムとして保存するダイアログ
 *
 * 品目一覧の各行から呼ばれる想定で、渡すのは対象の MealRecordItem のみ。
 * 100gあたりへの換算は useSaveItemAsCustomFood が行う。
 */
import { useEffect, useState } from "react";
import { BookmarkPlus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSaveItemAsCustomFood } from "../hooks/useSaveItemAsCustomFood";
import type { MealRecordItem } from "@/types";

interface SaveAsCustomFoodModalProps {
  show: boolean;
  item: MealRecordItem | null;
  onClose: () => void;
}

export default function SaveAsCustomFoodModal({
  show,
  item,
  onClose,
}: SaveAsCustomFoodModalProps) {
  const [name, setName] = useState("");
  const { saveItemAsCustomFood, isSaving } = useSaveItemAsCustomFood();

  // 別の品目を開き直したときに前回の入力を引きずらない
  useEffect(() => {
    if (show) setName(item?.item_name ?? "");
  }, [show, item]);

  const handleSubmit = async () => {
    if (!item || !name.trim()) return;
    const food = await saveItemAsCustomFood(item, name.trim());
    if (food) onClose();
  };

  return (
    <Dialog open={show} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookmarkPlus className="h-4 w-4" />
            Myアイテムとして保存
          </DialogTitle>
          <DialogDescription>
            この品目を100gあたりの値に換算し、再利用できるMyアイテムとして保存します
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="save-as-custom-food-name">
            アイテム名 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="save-as-custom-food-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 手作りサラダ"
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || !name.trim()}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              "保存する"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
