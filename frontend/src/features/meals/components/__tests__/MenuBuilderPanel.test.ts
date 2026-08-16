/**
 * toMenuItemPayload テスト
 *
 * Myアイテム（100gあたりの値しか持たない）を明細へ変換する経路の回帰テスト。
 * carbs_per_100g / fiber_per_100g を取り違えて炭水化物と食物繊維が 0 になる
 * 不具合があったため、供給元ごとに全栄養素が生き残ることを確認する。
 */
import { describe, it, expect } from "vitest";
import { toMenuItemPayload } from "@/features/meals/components/MenuBuilderPanel";
import { createMockCustomFood } from "@/test/helpers";

describe("toMenuItemPayload", () => {
  describe("Myアイテム（100gあたりの値）", () => {
    const customFood = createMockCustomFood({
      carbs_per_100g: 30,
      fiber_per_100g: 4,
      calories_per_100g: 200,
      protein_per_100g: 10,
      fat_per_100g: 5,
    });

    it("炭水化物と食物繊維が 0 にならない", () => {
      const payload = toMenuItemPayload({
        ...customFood,
        item_name: customFood.name,
        item_type: "custom",
        amount: 100,
      });

      expect(payload.carbohydrates).toBe(30);
      expect(payload.dietary_fiber).toBe(4);
    });

    it("分量に応じて按分される", () => {
      const payload = toMenuItemPayload({
        ...customFood,
        item_name: customFood.name,
        item_type: "custom",
        amount: 150,
      });

      expect(payload.amount_grams).toBe(150);
      expect(payload.calories).toBe(300);
      expect(payload.protein).toBe(15);
      expect(payload.fat).toBe(7.5);
      expect(payload.carbohydrates).toBe(45);
      expect(payload.dietary_fiber).toBe(6);
    });
  });

  describe("実数値で届く供給元", () => {
    it("検索・食堂・手動の値はそのまま使う", () => {
      const payload = toMenuItemPayload({
        item_type: "standard",
        item_id: 7,
        item_name: "白米",
        amount_grams: 200,
        calories: 336,
        protein: 5,
        fat: 0.6,
        carbohydrates: 74.2,
        dietary_fiber: 0.6,
      });

      expect(payload.item_id).toBe(7);
      expect(payload.carbohydrates).toBe(74.2);
      expect(payload.dietary_fiber).toBe(0.6);
      expect(payload.amount_grams).toBe(200);
    });

    it("欠けている栄養素は 0 で埋める", () => {
      const payload = toMenuItemPayload({
        item_name: "テスト",
        calories: 100,
      });

      expect(payload.vitamin_c).toBe(0);
      expect(payload.carbohydrates).toBe(0);
      expect(payload.amount_grams).toBe(100);
    });
  });

  describe("item_type の推定", () => {
    it("menu_id があれば食堂メニュー", () => {
      const payload = toMenuItemPayload({
        item_name: "日替わり定食",
        menu_id: 42,
        calories: 700,
      });

      expect(payload.item_type).toBe("cafeteria");
      expect(payload.item_id).toBe(42);
    });

    it("指定があればそれを優先する", () => {
      const payload = toMenuItemPayload({
        item_name: "自作弁当",
        item_type: "custom",
        calories: 500,
      });

      expect(payload.item_type).toBe("custom");
    });
  });
});
