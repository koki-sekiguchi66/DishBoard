/**
 * 体重記録関連の型定義
 */

/** 体重記録（WeightRecord モデル対応） */
export interface WeightRecord {
  id: number;
  record_date: string;
  weight: number;
  body_fat_percentage?: number | null;
  memo?: string;
  created_at?: string;
  updated_at?: string;
}

/** 体重記録作成リクエスト */
export interface CreateWeightRequest {
  record_date: string;
  weight: number | string;
}

/** 体重記録更新リクエスト */
export type UpdateWeightRequest = Partial<CreateWeightRequest>;
