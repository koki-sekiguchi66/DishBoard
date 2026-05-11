import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Meal {
  id: number;
  record_date: string;
  calories: number | string;
  protein: number | string;
  fat: number | string;
  carbohydrates: number | string;
}

interface WeeklyTrendProps {
  meals: Meal[];
}

interface WeekStats {
  avgCalories: number;
  avgProtein: number;
  avgFat: number;
  avgCarbs: number;
  days: number;
}

/** 指定期間内の日別平均を計算 */
function calcWeekStats(meals: Meal[], startDate: Date, endDate: Date): WeekStats {
  const filtered = meals.filter((m) => {
    const d = new Date(m.record_date);
    return d >= startDate && d <= endDate;
  });

  if (filtered.length === 0) {
    return { avgCalories: 0, avgProtein: 0, avgFat: 0, avgCarbs: 0, days: 0 };
  }

  // 日別に集計
  const daily = new Map<string, { cal: number; p: number; f: number; c: number }>();
  for (const m of filtered) {
    const existing = daily.get(m.record_date) ?? { cal: 0, p: 0, f: 0, c: 0 };
    existing.cal += parseFloat(String(m.calories || 0));
    existing.p += parseFloat(String(m.protein || 0));
    existing.f += parseFloat(String(m.fat || 0));
    existing.c += parseFloat(String(m.carbohydrates || 0));
    daily.set(m.record_date, existing);
  }

  const days = daily.size;
  let totalCal = 0, totalP = 0, totalF = 0, totalC = 0;
  for (const v of daily.values()) {
    totalCal += v.cal;
    totalP += v.p;
    totalF += v.f;
    totalC += v.c;
  }

  return {
    avgCalories: days > 0 ? totalCal / days : 0,
    avgProtein: days > 0 ? totalP / days : 0,
    avgFat: days > 0 ? totalF / days : 0,
    avgCarbs: days > 0 ? totalC / days : 0,
    days,
  };
}

/** 差分アイコン */
function DiffIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return <Minus className="h-3 w-3 text-muted-foreground" />;
  const diff = current - previous;
  const pct = Math.round((diff / previous) * 100);

  if (Math.abs(pct) < 3) return <Minus className="h-3 w-3 text-muted-foreground" />;

  return diff > 0 ? (
    <span className="flex items-center gap-0.5 text-[10px] text-orange-400">
      <TrendingUp className="h-3 w-3" />+{pct}%
    </span>
  ) : (
    <span className="flex items-center gap-0.5 text-[10px] text-green-400">
      <TrendingDown className="h-3 w-3" />{pct}%
    </span>
  );
}

export function WeeklyTrend({ meals }: WeeklyTrendProps) {
  const { thisWeek, lastWeek } = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const thisStart = new Date(today);
    thisStart.setDate(today.getDate() - 6);
    thisStart.setHours(0, 0, 0, 0);

    const lastEnd = new Date(thisStart);
    lastEnd.setDate(thisStart.getDate() - 1);
    lastEnd.setHours(23, 59, 59, 999);

    const lastStart = new Date(lastEnd);
    lastStart.setDate(lastEnd.getDate() - 6);
    lastStart.setHours(0, 0, 0, 0);

    return {
      thisWeek: calcWeekStats(meals, thisStart, today),
      lastWeek: calcWeekStats(meals, lastStart, lastEnd),
    };
  }, [meals]);

  const items = [
    { label: "カロリー", value: thisWeek.avgCalories, prev: lastWeek.avgCalories, unit: "kcal", colorClass: "text-primary" },
    { label: "P", value: thisWeek.avgProtein, prev: lastWeek.avgProtein, unit: "g", colorClass: "text-blue-400" },
    { label: "F", value: thisWeek.avgFat, prev: lastWeek.avgFat, unit: "g", colorClass: "text-yellow-400" },
    { label: "C", value: thisWeek.avgCarbs, prev: lastWeek.avgCarbs, unit: "g", colorClass: "text-green-400" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          週間サマリー
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            直近7日間の日平均{thisWeek.days > 0 ? `（${thisWeek.days}日分）` : ""}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2">
          {items.map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
              <p className={cn("text-lg font-bold tabular-nums", item.colorClass)}>
                {Math.round(item.value)}
              </p>
              <p className="text-[10px] text-muted-foreground">{item.unit}/日</p>
              <DiffIndicator current={item.value} previous={item.prev} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
