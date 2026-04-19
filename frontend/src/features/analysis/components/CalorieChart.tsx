/**
 * CalorieChart — カロリー推移グラフ（Phase 2 移行版）
 *
 * 変更点:
 *   - Bootstrap Card → shadcn/ui Card + Tailwind
 *   - Bootstrap Icons → lucide-react
 *   - Dark Pop テーマカラー適用（Recharts のスタイル更新）
 *   - JSX → TSX（型安全化）
 *
 * Recharts 自体は変更なし（仕様書通り）。
 */
import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Flame, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Meal {
  id: number;
  record_date: string;
  calories: number | string;
  meal_name?: string;
  [key: string]: unknown;
}

interface CalorieChartProps {
  meals: Meal[];
}

interface DailyData {
  date: string;
  totalCalories: number;
  formattedDate: string;
}

/** Dark Pop テーマに合わせたカスタムツールチップ */
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: DailyData }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const dateStr = new Date(data.date).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="rounded-lg border border-border bg-background/95 p-3 shadow-lg backdrop-blur">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{dateStr}</p>
      <p className="flex items-center gap-1.5 text-sm font-bold text-primary">
        <Flame className="h-3.5 w-3.5" />
        {Math.round(data.totalCalories)} kcal
      </p>
    </div>
  );
}

export function CalorieChart({ meals }: CalorieChartProps) {
  const chartData = useMemo<DailyData[]>(() => {
    if (!meals?.length) return [];

    const daily = meals.reduce<Record<string, { date: string; totalCalories: number }>>(
      (acc, meal) => {
        const date = meal.record_date;
        if (!acc[date]) {
          acc[date] = { date, totalCalories: 0 };
        }
        acc[date].totalCalories += parseFloat(String(meal.calories || 0));
        return acc;
      },
      {}
    );

    return Object.values(daily)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((day) => ({
        ...day,
        formattedDate: new Date(day.date).toLocaleDateString("ja-JP", {
          month: "short",
          day: "numeric",
        }),
      }));
  }, [meals]);

  if (!meals?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Flame className="h-5 w-5 text-primary" />
            カロリー推移
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">
            データがありません
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Flame className="h-5 w-5 text-primary" />
          カロリー推移
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* グラフ */}
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                opacity={0.3}
              />
              <XAxis
                dataKey="formattedDate"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={45}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="totalCalories"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 3 }}
                activeDot={{
                  r: 5,
                  stroke: "hsl(var(--primary))",
                  strokeWidth: 2,
                  fill: "hsl(var(--background))",
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 最近の記録 */}
        <div>
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            最近の記録
          </h4>
          <div className="grid grid-cols-2 gap-1.5">
            {chartData.slice(-6).reverse().map((day) => (
              <div
                key={day.date}
                className="flex items-center justify-between rounded-md bg-secondary/50 px-2.5 py-1.5 text-xs"
              >
                <span className="text-muted-foreground">{day.formattedDate}</span>
                <span className="font-semibold text-primary">
                  {Math.round(day.totalCalories)} kcal
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default CalorieChart;
