/**
 * Mascot — DishBoardのマスコット（おにぎり）
 *
 * CharacterGreeting の絵文字プレースホルダーを差し替えるための線画キャラクター。
 * 本体（米粒部分）は currentColor を使い、親要素の text-* で色を制御する。
 * 海苔・目・口は --board（黒板の色）固定にしている。
 * 現状の利用箇所（黒板パネル上、text-board-foreground＝明るいチョーク色）を前提にした配色で、
 * 本体を暗い文字色にする文脈で使う場合は別途配色を見直すこと。
 */
interface MascotProps {
  mood?: "normal" | "sleepy";
  className?: string;
}

export function Mascot({ mood = "normal", className }: MascotProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label={mood === "sleepy" ? "眠そうなおにぎりのキャラクター" : "おにぎりのキャラクター"}
    >
      {/* 本体 */}
      <path
        d="M50,8 C54,8 56,10 58,14 L88,78 C90,82 89,88 84,90 L16,90 C11,88 10,82 12,78 L42,14 C44,10 46,8 50,8 Z"
        fill="currentColor"
      />
      {/* 海苔 */}
      <path d="M16,66 L84,66 L84,90 L16,90 Z" fill="var(--board)" />
      {mood === "sleepy" ? (
        <>
          <path d="M35,49 Q40,45 45,49" stroke="var(--board)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M55,49 Q60,45 65,49" stroke="var(--board)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M43,60 Q50,58 57,60" stroke="var(--board)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="40" cy="48" r="3" fill="var(--board)" />
          <circle cx="60" cy="48" r="3" fill="var(--board)" />
          <path d="M43,58 Q50,63 57,58" stroke="var(--board)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
