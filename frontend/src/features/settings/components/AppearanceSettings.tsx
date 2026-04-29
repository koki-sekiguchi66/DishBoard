/**
 * AppearanceSettings — 表示設定コンポーネント（Phase 4 スタブ版）
 *
 * Phase 4 では「枠組みのみ」実装。
 * 実際のテーマ切替（ダーク/ライト）は将来的にニーズが顕在化したら実装する。
 *
 * 現状の DishBoard は Dark Pop 一択のため、Switch は disabled。
 * Phase 5 以降で次のような拡張を想定:
 *   - ダーク/ライトテーマ切替
 *   - フォントサイズ（小/中/大）
 *   - キャラクター表示の有無
 *
 * 設計判断:
 *   - YAGNI: 今は不要だが、設定ページの「形」を整えるためのプレースホルダー
 *   - Switch コンポーネントの利用例として教育的価値もある
 */
import { Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export function AppearanceSettings() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Palette className="h-4 w-4" />
          表示設定
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Label htmlFor="dark-mode-toggle" className="text-sm font-medium">
                ダークモード
              </Label>
              <Badge variant="secondary" className="text-[10px]">
                近日公開
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              現在は常時ダークテーマが適用されています
            </p>
          </div>
          <Switch
            id="dark-mode-toggle"
            checked={true}
            disabled
            aria-label="ダークモード切替（無効）"
          />
        </div>
      </CardContent>
    </Card>
  );
}
