/**
 * WeightChart — 体重推移グラフ（Phase 2 移行版）
 *
 * 変更点: CalorieChart と同様に Bootstrap → Tailwind/shadcn/ui 移行。
 * Recharts 自体は変更なし。
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
import { Scale, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Weight {
  id: number;
  record_date: string;
  weight: number | string;
  [key: string]: unknown;
}

interface WeightChartProps {
  weights: Weight[];
}

interface ChartData {
  date: string;
  weight: number;
  formattedDate: string;
}

/** Dark Pop テーマ用カスタムツールチップ */
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartData; value: number }>;
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
      <p className="flex items-center gap-1.5 text-sm font-bold text-blue-400">
        <Scale className="h-3.5 w-3.5" />
        {data.weight} kg
      </p>
    </div>
  );
}

export function WeightChart({ weights }: WeightChartProps) {
  const chartData = useMemo<ChartData[]>(() => {
    if (!weights?.length) return [];

    return [...weights]
      .sort(
        (a, b) =>
          new Date(a.record_date).getTime() - new Date(b.record_date).getTime()
      )
      .map((w) => ({
        date: w.record_date,
        weight: parseFloat(String(w.weight)),
        formattedDate: new Date(w.record_date).toLocaleDateString("ja-JP", {
          month: "short",
          day: "numeric",
        }),
      }));
  }, [weights]);

  if (!weights?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="h-5 w-5 text-blue-400" />
            体重推移
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
          <Scale className="h-5 w-5 text-blue-400" />
          体重推移
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
                width={40}
                domain={["dataMin - 1", "dataMax + 1"]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#60a5fa"
                strokeWidth={2}
                dot={{ fill: "#60a5fa", strokeWidth: 2, r: 3 }}
                activeDot={{
                  r: 5,
                  stroke: "#60a5fa",
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
            {chartData.slice(-6).reverse().map((w) => (
              <div
                key={w.date}
                className="flex items-center justify-between rounded-md bg-secondary/50 px-2.5 py-1.5 text-xs"
              >
                <span className="text-muted-foreground">{w.formattedDate}</span>
                <span className="font-semibold text-blue-400">{w.weight} kg</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default WeightChart;
