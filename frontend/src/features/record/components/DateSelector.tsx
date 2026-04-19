import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DateSelectorProps {
  selectedDate: string; // "YYYY-MM-DD"
  onDateChange: (date: string) => void;
}

function formatDateJa(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
  return `${month}月${day}日（${dayOfWeek}）`;
}

/** 日付を n 日ずらした "YYYY-MM-DD" を返す */
function shiftDate(dateStr: string, days: number): string {
  const date = new Date(dateStr + "T00:00:00");
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DateSelector({ selectedDate, onDateChange }: DateSelectorProps) {
  const today = new Date().toISOString().split("T")[0];
  const isToday = selectedDate === today;

  return (
    <div className="flex items-center justify-between">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDateChange(shiftDate(selectedDate, -1))}
        aria-label="前日"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">
          {formatDateJa(selectedDate)}
        </span>
        {!isToday && (
          <button
            onClick={() => onDateChange(today)}
            className={cn(
              "rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary",
              "transition-colors hover:bg-primary/30"
            )}
          >
            今日
          </button>
        )}
        {isToday && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
            TODAY
          </span>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDateChange(shiftDate(selectedDate, 1))}
        disabled={isToday}
        aria-label="翌日"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}