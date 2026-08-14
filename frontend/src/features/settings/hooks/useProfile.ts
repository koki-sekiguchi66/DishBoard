/**
 * useProfile — ユーザープロフィール取得フック
 *
 * /api/profile/ から username / email を取得し、
 * loading / error / data の3状態を管理する。
 *
 * 設計判断:
 *   - マウント時に1回だけ fetch（依存配列 []）
 *   - 401 エラー時はトークン期限切れの可能性があるため、
 *     エラーメッセージを返すだけでリダイレクトはしない（App.tsx の責務）
 *   - リトライは手動（refetch 関数を公開）
 */
import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/axios";

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  date_joined: string;
}

interface UseProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useProfile(): UseProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<UserProfile>("/profile/");
      setProfile(data);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      if (e.response?.status === 401) {
        setError("認証エラー。再ログインしてください。");
      } else {
        setError("プロフィールの取得に失敗しました。");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, error, refetch: fetchProfile };
}
