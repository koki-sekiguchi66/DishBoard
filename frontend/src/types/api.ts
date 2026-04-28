/**
 * API共通型定義
 */
import type { AxiosError } from "axios";

/** API エラーレスポンスの共通形式 */
export interface ApiErrorResponse {
  error?: string;
  message?: string;
  detail?: string;
  [key: string]: unknown;
}

/** Axios エラーの型ヘルパー */
export type ApiError = AxiosError<ApiErrorResponse>;

/** ページネーション対応レスポンス */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
