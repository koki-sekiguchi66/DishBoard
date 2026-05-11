import { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Meal {
  id: number;
  record_date: string;
}

interface HeatmapCalendarProps {
  /** 全期間の食事記録 */
  meals: Meal[];
  /** 表示する週数（デフォルト12週） */
  weeks?: number;
}

/** 日ごとの記録数を集計 */
function buildDailyCountMap(meals: Meal[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const meal of meals) {
    const count = map.get(meal.record_date) ?? 0;
    map.set(meal.record_date, count + 1);
  }
  return map;
}

/** 記録数に応じた色の透明度を返す (0 → 透明, 4+ → 最濃) */
function getOpacity(count: number): number {
  if (count === 0) return 0;
  if (count <= 1) return 0.25;
  if (count <= 2) return 0.5;
  if (count <= 3) return 0.75;
  return 1.0;
}

/** "YYYY-MM-DD" を返す */
function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

const CELL_SIZE = 14;
const CELL_GAP = 3;
const DAY_LABELS = ["月", "", "水", "", "金", "", ""];

export function HeatmapCalendar({ meals, weeks = 12 }: HeatmapCalendarProps) {
  const { grid, countMap } = useMemo(() => {
    const map = buildDailyCountMap(meals);

    // 今日を基準に weeks 週分の日付グリッドを生成
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 今週の日曜日を取得
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - today.getDay()));

    const totalDays = weeks * 7;
    const startDate = new Date(endOfWeek);
    startDate.setDate(endOfWeek.getDate() - totalDays + 1);

    // 7行 × weeks列 のグリッドを構築
    const cells: { date: string; col: number; row: number; count: number }[] = [];
    const cursor = new Date(startDate);

    for (let i = 0; i < totalDays; i++) {
      const dateStr = toDateStr(cursor);
      const col = Math.floor(i / 7);
      const row = i % 7;
      cells.push({
        date: dateStr,
        col,
        row,
        count: map.get(dateStr) ?? 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return { grid: cells, countMap: map };
  }, [meals, weeks]);

  const svgWidth = weeks * (CELL_SIZE + CELL_GAP) + 20;
  const svgHeight = 7 * (CELL_SIZE + CELL_GAP) + 4;

  const totalRecordDays = countMap.size;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            記録カレンダー
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            {totalRecordDays}日記録
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <svg
            width={svgWidth}
            height={svgHeight}
            className="mx-auto"
            role="img"
            aria-label="記録ヒートマップカレンダー"
          >
            {/* 曜日ラベル */}
            {DAY_LABELS.map((label, i) =>
              label ? (
                <text
                  key={`label-${i}`}
                  x={0}
                  y={i * (CELL_SIZE + CELL_GAP) + CELL_SIZE - 2}
                  className="fill-muted-foreground text-[9px]"
                >
                  {label}
                </text>
              ) : null
            )}

            {/* セル */}
            {grid.map((cell) => (
              <rect
                key={cell.date}
                x={cell.col * (CELL_SIZE + CELL_GAP) + 18}
                y={cell.row * (CELL_SIZE + CELL_GAP)}
                width={CELL_SIZE}
                height={CELL_SIZE}
                rx={3}
                className={
                  cell.count === 0
                    ? "fill-secondary"
                    : "fill-primary"
                }
                style={{
                  opacity: cell.count === 0 ? 1 : getOpacity(cell.count),
                }}
              >
                <title>
                  {cell.date}: {cell.count}件
                </title>
              </rect>
            ))}
          </svg>
        </div>

        {/* 凡例 */}
        <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
          <span>少</span>
          {[0, 0.25, 0.5, 0.75, 1.0].map((op) => (
            <div
              key={op}
              className={op === 0 ? "h-2.5 w-2.5 rounded-sm bg-secondary" : "h-2.5 w-2.5 rounded-sm bg-primary"}
              style={{ opacity: op === 0 ? 1 : op }}
            />
          ))}
          <span>多</span>
        </div>
      </CardContent>
    </Card>
  );
}
