export interface Meal {
  id: number;
  meal_name: string;
  meal_timing: string;
  calories: number;
  protein: number;
  fat: number;
  carbohydrates: number;
}

export interface DailySummary {
  total_calories: number;
  total_protein: number;
  total_fat: number;
  total_carbohydrates: number;
  meal_count: number;
}