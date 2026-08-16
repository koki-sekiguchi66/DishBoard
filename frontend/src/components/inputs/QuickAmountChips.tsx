/**
 * QuickAmountChips — よく使う数値をワンタップで入れるチップ列
 *
 * 分量や栄養素の入力は「だいたいいつも同じ値」になりがちなので、
 * キーボードを開かずに確定できる導線を用意する。
 */
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuickAmountChipsProps {
  /** 候補値。表示順のまま並ぶ */
  values: number[];
  /** 現在値。一致するチップを選択状態にする */
  current?: number;
  unit?: string;
  onSelect: (value: number) => void;
  className?: string;
}

export default function QuickAmountChips({
  values,
  current,
  unit,
  onSelect,
  className,
}: QuickAmountChipsProps) {
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {values.map((value) => {
        const isActive = current === value;
        return (
          <Button
            key={value}
            type="button"
            variant={isActive ? "secondary" : "outline"}
            size="sm"
            onClick={() => onSelect(value)}
            aria-pressed={isActive}
            className={cn(
              "h-6 rounded-full px-2 text-[11px] font-medium tabular-nums",
              isActive && "border-primary/60 text-foreground"
            )}
          >
            {value}
            {unit}
          </Button>
        );
      })}
    </div>
  );
}
