/**
 * MeasureField — キッチンスケールを模した数値入力
 *
 * 栄養値の入力には固有の摩擦が3つある。
 *   1. 初期値 0 をいちいち消してから打ち直す
 *   2. 「あと少し」の微調整のたびにキーボードへ戻る
 *   3. type="number" のスピナーが小さく、ホイールで誤爆する
 * それぞれ、値を文字列で保持して空欄を許すこと・目盛りのドラッグと ± の長押し・
 * type="text" + inputMode="decimal" で解消している。
 *
 * 目盛り帯はスケールの指針をなぞった見た目で、そのままドラッグ面も兼ねる
 * （左右にこすると値が動く）。値に応じて帯が流れるので、増減の量が目で分かる。
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Focus, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import QuickAmountChips from "./QuickAmountChips";

/** 目盛り1つぶんの横幅。ドラッグ量を step に換算する係数でもある */
const PX_PER_TICK = 9;
/** 何目盛りごとに長い線を引くか */
const MAJOR_TICK_EVERY = 5;
/** これ未満の移動はタップの手ブレとみなす */
const DRAG_THRESHOLD_PX = 3;
/** 長押しが連射に変わるまでの待ち */
const HOLD_DELAY_MS = 400;
/** 連射の間隔 */
const HOLD_INTERVAL_MS = 60;
/** 連射がこの回数を超えたら刻みを10倍にする */
const HOLD_ACCEL_AFTER = 10;
/** Shift + 矢印キーの倍率 */
const COARSE_MULTIPLIER = 10;
/** 精密モード時に step を割る係数。ドラッグ・±・矢印キーの刻みを一段細かくする */
const PRECISION_DIVISOR = 10;

/** 次のフィールドへ Enter で送るための目印 */
const MEASURE_INPUT_ATTR = "data-measure-input";

export type MeasureAccent = "calories" | "protein" | "fat" | "carbs" | "neutral";

const ACCENT_CLASS: Record<MeasureAccent, string> = {
  calories: "text-calories",
  protein: "text-protein",
  fat: "text-fat",
  carbs: "text-carbs",
  neutral: "text-muted-foreground",
};

interface MeasureFieldProps {
  label: string;
  unit: string;
  /** 空欄を表現するため文字列で保持する。"12." のような入力途中の状態も壊さない */
  value: string;
  onChange: (value: string) => void;
  step?: number;
  min?: number;
  max?: number;
  accent?: MeasureAccent;
  /** ワンタップ候補。省略するとチップ列を出さない */
  presets?: number[];
  id?: string;
  autoFocus?: boolean;
}

/** 丸めの上限桁数。これ以上は浮動小数のノイズしか乗らない */
const MAX_DECIMALS = 3;

/** 小数点以下の桁数（"0.01" → 2） */
const decimalsOf = (value: number | string): number => {
  const text = String(value);
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
};

const toNumber = (value: string): number => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** 全角0-9 → 半角0-9（コードポイントを 0xFEE0 引くと ASCII と一致する） */
const FULLWIDTH_DIGIT_OFFSET = 0xfee0;
const toHalfWidthDigits = (raw: string): string =>
  raw.replace(/[０-９]/g, (d) =>
    String.fromCharCode(d.charCodeAt(0) - FULLWIDTH_DIGIT_OFFSET)
  );

/**
 * 数字と小数点1つだけを残す。IME や単位の貼り付けを弾く。
 *
 * 全角数字と「．」「。」「,」は小数点として正規化してから絞り込む。
 * 一部端末の日本語キーボード（全角入力中の Android 等）はここを
 * そのまま捨てると、小数点以下がまったく入力できなくなる。
 */
const sanitize = (raw: string): string =>
  toHalfWidthDigits(raw)
    .replace(/[．。,]/g, ".")
    .replace(/[^\d.]/g, "")
    .replace(/(\..*)\./g, "$1");

export default function MeasureField({
  label,
  unit,
  value,
  onChange,
  step = 1,
  min = 0,
  max,
  accent = "neutral",
  presets,
  id,
  autoFocus,
}: MeasureFieldProps) {
  const [isDragging, setIsDragging] = useState(false);
  // 精密モード: ± / ドラッグ / 矢印キーの刻みを step の1/10にする
  const [isPrecise, setIsPrecise] = useState(false);
  const effectiveStep = isPrecise ? step / PRECISION_DIVISOR : step;

  // 長押し・ドラッグ中のコールバックが古い値を掴まないよう ref で追う
  const valueRef = useRef(value);
  valueRef.current = value;

  const holdTimer = useRef<number | null>(null);
  const holdTicks = useRef(0);
  const dragOrigin = useRef<{ pointerId: number; x: number; value: number } | null>(
    null
  );

  const accentClass = ACCENT_CLASS[accent];

  const clamp = useCallback(
    (n: number) => {
      const lower = Math.max(min, n);
      return max === undefined ? lower : Math.min(max, lower);
    },
    [max, min]
  );

  /**
   * ± / ドラッグによる増減を反映する。
   * 丸めの桁数は有効 step（精密モード時は1/10）と入力済みの値の細かいほうに合わせる。
   * step だけを見ると、step=1 のフィールドに打った 20.5 が加減算のたびに潰れてしまう。
   */
  const commit = useCallback(
    (next: number) => {
      const decimals = Math.min(
        MAX_DECIMALS,
        Math.max(decimalsOf(effectiveStep), decimalsOf(valueRef.current))
      );
      // toFixed で丸めてから parseFloat し直し、"58.0" を "58" に畳む
      onChange(String(parseFloat(clamp(next).toFixed(decimals))));
    },
    [clamp, onChange, effectiveStep]
  );

  const nudge = useCallback(
    (direction: 1 | -1, multiplier = 1) => {
      commit(toNumber(valueRef.current) + direction * effectiveStep * multiplier);
    },
    [commit, effectiveStep]
  );

  const stopHold = useCallback(() => {
    if (holdTimer.current !== null) window.clearInterval(holdTimer.current);
    holdTimer.current = null;
    holdTicks.current = 0;
  }, []);

  const startHold = useCallback(
    (direction: 1 | -1) => {
      nudge(direction);
      stopHold();
      const pressedAt = Date.now();
      holdTimer.current = window.setInterval(() => {
        if (Date.now() - pressedAt < HOLD_DELAY_MS) return;
        holdTicks.current += 1;
        nudge(
          direction,
          holdTicks.current > HOLD_ACCEL_AFTER ? COARSE_MULTIPLIER : 1
        );
      }, HOLD_INTERVAL_MS);
    },
    [nudge, stopHold]
  );

  useEffect(() => stopHold, [stopHold]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(sanitize(e.target.value));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const multiplier = e.shiftKey ? COARSE_MULTIPLIER : 1;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      nudge(1, multiplier);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      nudge(-1, multiplier);
    } else if (e.key === "Enter") {
      // 12項目を続けて打つときにマウスへ戻らずに済ませる
      e.preventDefault();
      const inputs = Array.from(
        document.querySelectorAll<HTMLInputElement>(`[${MEASURE_INPUT_ATTR}]`)
      );
      const next = inputs[inputs.indexOf(e.currentTarget) + 1];
      next?.focus();
      next?.select();
    }
  };

  /** 表記の整形と範囲だけ直す。桁は落とさない（"05." → "5"、上限超過 → 上限） */
  const handleBlur = () => {
    if (value === "") return;
    const normalized = String(clamp(toNumber(value)));
    if (normalized !== value) onChange(normalized);
  };

  const handleDragStart = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragOrigin.current = {
      pointerId: e.pointerId,
      x: e.clientX,
      value: toNumber(valueRef.current),
    };
    setIsDragging(true);
  };

  const handleDragMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const origin = dragOrigin.current;
    if (!origin || origin.pointerId !== e.pointerId) return;
    const dx = e.clientX - origin.x;
    if (Math.abs(dx) < DRAG_THRESHOLD_PX) return;
    commit(origin.value + Math.round(dx / PX_PER_TICK) * effectiveStep);
  };

  const handleDragEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragOrigin.current = null;
    setIsDragging(false);
  };

  const minorGap = `${PX_PER_TICK}px`;
  const majorGap = `${PX_PER_TICK * MAJOR_TICK_EVERY}px`;
  const rulerOffset = -(toNumber(value) / effectiveStep) * PX_PER_TICK;
  const edgeFade =
    "linear-gradient(to right, transparent, #000 15%, #000 85%, transparent)";

  return (
    <div
      className={cn(
        "rounded-lg border bg-secondary/30 px-2.5 pb-1.5 pt-1.5 transition-colors",
        isDragging ? "border-ring" : "border-border"
      )}
    >
      {/* ラベル / 単位 */}
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <span
            className={cn("h-2.5 w-[3px] shrink-0 rounded-full bg-current", accentClass)}
            aria-hidden="true"
          />
          <span className="truncate">{label}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <span className="text-[10px] text-muted-foreground">{unit}</span>
          <button
            type="button"
            onClick={() => setIsPrecise((prev) => !prev)}
            aria-pressed={isPrecise}
            aria-label={
              isPrecise
                ? `${label}の精密モードを解除（刻み幅を戻す）`
                : `${label}を精密モードにする（刻み幅を1/10にして小数点以下を調整しやすくする）`
            }
            title="精密モード"
            className={cn(
              "rounded p-0.5 text-muted-foreground/60 transition-colors hover:text-foreground",
              isPrecise && accentClass
            )}
          >
            <Focus className="h-3 w-3" />
          </button>
        </span>
      </div>

      {/* 数値 + ステッパー */}
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`${label}を減らす`}
          className="h-7 w-7 shrink-0 rounded-full text-muted-foreground"
          onPointerDown={() => startHold(-1)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
        >
          <Minus />
        </Button>

        <input
          data-measure-input=""
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-label={`${label}（${unit}）`}
          value={value}
          placeholder="0"
          autoFocus={autoFocus}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 bg-transparent text-center text-lg font-semibold tabular-nums text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground/40"
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`${label}を増やす`}
          className="h-7 w-7 shrink-0 rounded-full text-muted-foreground"
          onPointerDown={() => startHold(1)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
        >
          <Plus />
        </Button>
      </div>

      {/* 目盛り帯（ドラッグ面）。キーボードでも ± でも同じ操作ができるので支援技術からは隠す */}
      <div
        aria-hidden="true"
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
        className={cn(
          "relative h-3.5 cursor-ew-resize touch-none select-none transition-colors",
          isDragging ? accentClass : "text-border"
        )}
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 0 1px, transparent 1px), linear-gradient(to right, currentColor 0 1px, transparent 1px)",
          backgroundSize: `${majorGap} 70%, ${minorGap} 35%`,
          backgroundRepeat: "repeat-x",
          backgroundPosition: `${rulerOffset}px bottom, ${rulerOffset}px bottom`,
          maskImage: edgeFade,
          WebkitMaskImage: edgeFade,
        }}
      >
        {/* 指針 */}
        <span
          className={cn(
            "absolute bottom-0 left-1/2 h-full w-[2px] -translate-x-1/2 rounded-full bg-current",
            accentClass
          )}
        />
      </div>

      {presets && presets.length > 0 && (
        <QuickAmountChips
          className="mt-1.5 justify-center"
          values={presets}
          current={value === "" ? undefined : toNumber(value)}
          unit={unit}
          onSelect={(preset) => onChange(String(preset))}
        />
      )}
    </div>
  );
}
