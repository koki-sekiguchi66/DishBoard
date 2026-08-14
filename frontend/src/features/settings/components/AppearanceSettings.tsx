/**
 * AppearanceSettings — 表示設定コンポーネント
 */
import { Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTheme } from "../hooks/useTheme";

export function AppearanceSettings() {
  const { theme, toggle } = useTheme();

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
            <Label htmlFor="dark-mode-toggle" className="text-sm font-medium">
              ダークモード
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {theme === "dark"
                ? "ダークテーマが適用されています"
                : "ライトテーマが適用されています"}
            </p>
          </div>
          <Switch
            id="dark-mode-toggle"
            checked={theme === "dark"}
            onCheckedChange={toggle}
            aria-label="ダークモード切替"
          />
        </div>
      </CardContent>
    </Card>
  );
}
