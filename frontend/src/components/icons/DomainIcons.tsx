/**
 * DishBoard固有の意味を持つ場面（食事・体重）だけに使う自作アイコン。
 * 閉じる・シェブロン等の操作アイコンは引き続き lucide-react を使う（ADR #21）。
 * lucideと同じ viewBox 0 0 24 24 / strokeWidth 相当で揃え、混在しても違和感が出ないようにしている。
 */
interface IconProps {
  className?: string;
}

/** 食事記録: マスコット（おにぎり）と同じ輪郭の線画版 */
export function RiceBallIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3.5c.6 0 1.1.3 1.3.9l6 12.3c.5 1.1-.1 2.4-1.3 2.7-.2 0-.4.1-.6.1H6.6c-1.2 0-2.2-1-2.2-2.2 0-.3 0-.5.1-.7l6-12.2c.3-.6.8-.9 1.5-.9Z" />
      <path d="M5.7 15.3h12.6" />
    </svg>
  );
}

/** 体重記録: MeasureFieldの目盛り帯（ADR #18）と同じ意匠のゲージ */
export function ScaleGaugeIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="7" width="16" height="12" rx="3" />
      <path d="M6.7 11.3v1.2M12 10v1.2M17.3 11.3v1.2" />
      <path d="M8 15.6 10.4 12.6" />
      <circle cx="8" cy="15.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
