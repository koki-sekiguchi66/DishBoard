/**
 * weightApi テスト（Phase 3 TypeScript版）
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockWeight } from "@/test/helpers";

vi.mock("@/lib/axios", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { weightApi } from "@/features/weights/api/weightApi";
import { apiClient } from "@/lib/axios";

describe("weightApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getWeights", () => {
    it("体重記録一覧を取得", async () => {
      const mockWeights = [
        createMockWeight(),
        createMockWeight({ id: 2, weight: 66.0 }),
      ];
      (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockWeights,
      });

      const result = await weightApi.getWeights();

      expect(apiClient.get).toHaveBeenCalledWith("/weights/");
      expect(result).toHaveLength(2);
    });
  });

  describe("createWeight", () => {
    it("体重記録を作成", async () => {
      const weightData = { record_date: "2025-01-15", weight: "65.5" };
      const created = createMockWeight(weightData);
      (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: created,
      });

      const result = await weightApi.createWeight(weightData);

      expect(apiClient.post).toHaveBeenCalledWith("/weights/", weightData);
      expect(result.weight).toBe(65.5);
    });
  });

  describe("updateWeight", () => {
    it("指定IDの体重記録を更新", async () => {
      const updated = createMockWeight({ id: 3, weight: 64.0 });
      (apiClient.put as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: updated,
      });

      const result = await weightApi.updateWeight(3, { weight: 64.0 });

      expect(apiClient.put).toHaveBeenCalledWith("/weights/3/", {
        weight: 64.0,
      });
      expect(result.weight).toBe(64.0);
    });
  });

  describe("deleteWeight", () => {
    it("指定IDの体重記録を削除", async () => {
      (apiClient.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await weightApi.deleteWeight(3);

      expect(apiClient.delete).toHaveBeenCalledWith("/weights/3/");
    });
  });

  describe("エラーハンドリング", () => {
    it("ネットワークエラー時", async () => {
      (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Network Error")
      );

      await expect(weightApi.getWeights()).rejects.toThrow("Network Error");
    });
  });
});
