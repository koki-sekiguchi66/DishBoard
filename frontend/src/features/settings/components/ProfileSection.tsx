/**
 * ProfileSection — プロフィール表示セクション
 *
 * /api/profile/ から取得した username / email を表示する。
 * 読み取り専用。編集機能は将来実装。
 *
 * 3状態: loading → success | error
 */
import { User, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useProfile } from "../hooks/useProfile";

export function ProfileSection() {
  const { profile, loading, error, refetch } = useProfile();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="h-4 w-4" />
          プロフィール
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-between py-2">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="ghost" size="sm" onClick={refetch}>
              <RefreshCw className="mr-1 h-3 w-3" />
              再試行
            </Button>
          </div>
        ) : profile ? (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {profile.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">{profile.username}</p>
              {profile.email && (
                <p className="text-xs text-muted-foreground truncate">
                  {profile.email}
                </p>
              )}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
