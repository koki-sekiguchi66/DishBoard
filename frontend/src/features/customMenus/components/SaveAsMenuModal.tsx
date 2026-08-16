/**
 * SaveAsMenuModal — 既存の食事記録を Myメニューとして保存するダイアログ
 *
 * 記録一覧の各行から呼ばれる想定で、渡すのは mealId のみ。
 * 明細は useSaveMealAsMenu が保存直前に取得する。
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
import { Textarea } from "@/components/ui/textarea";
import { useSaveMealAsMenu } from "../hooks/useSaveMealAsMenu";

interface SaveAsMenuModalProps {
  show: boolean;
  mealId: number | null;
  defaultName?: string;
  onClose: () => void;
}

export default function SaveAsMenuModal({
  show,
  mealId,
  defaultName = "",
  onClose,
}: SaveAsMenuModalProps) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState("");
  const { saveMealAsMenu, isSaving } = useSaveMealAsMenu();

  // 別の記録を開き直したときに前回の入力を引きずらない
  useEffect(() => {
    if (show) {
      setName(defaultName);
      setDescription("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, mealId]);

  const handleSubmit = async () => {
    if (mealId === null || !name.trim()) return;
    const menu = await saveMealAsMenu(mealId, name.trim(), description.trim());
    if (menu) onClose();
  };

  return (
    <Dialog open={show} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookmarkPlus className="h-4 w-4" />
            Myメニューとして保存
          </DialogTitle>
          <DialogDescription>
            この記録の内容を、再利用できるメニューとして保存します
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="save-as-menu-name">
              メニュー名 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="save-as-menu-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: いつもの朝食"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="save-as-menu-description">説明（任意）</Label>
            <Textarea
              id="save-as-menu-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例: パン + サラダ + コーヒー"
              rows={2}
            />
          </div>
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
