import { useGreeting } from "../hooks/useGreeting";
import { Mascot } from "./Mascot";

/**
 * 記録ページのヒーロー部（黒板パネル）。
 * 「食堂の掲示板」提案（docs-public/ui-design-proposal.md, ADR #21）で
 * マスコット・挨拶・見出しをまとめて1枚の黒板として表現する場所のため、
 * 見出し（今日の献立）もここに含めている。
 */
export function CharacterGreeting() {
  const { emoji, message } = useGreeting();
  const mood = emoji === "🌙" ? "sleepy" : "normal";

  return (
    <div className="rounded-xl bg-board p-4">
      <div className="flex items-start gap-3">
        <Mascot mood={mood} className="h-11 w-11 shrink-0 text-board-foreground" />
        {/* 吹き出し */}
        <div className="flex-1 pt-0.5">
          <p className="text-sm leading-relaxed text-board-foreground">{message}</p>
          {/* ストリーク 現在はUI枠のみ */}
          <div className="mt-1.5 flex items-center gap-3">
            <span className="text-xs text-board-muted">🔥 ストリーク: --日</span>
            <span className="text-xs text-board-muted">⭐ Lv.--</span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <h2 className="text-lg font-bold text-board-foreground">今日の献立</h2>
        <svg
          className="mt-0.5 h-2 w-40 text-board-muted"
          viewBox="0 0 168 8"
          aria-hidden="true"
        >
          <path
            d="M2,5 Q40,1 84,4 T166,3"
            stroke="currentColor"
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
            opacity="0.6"
          />
        </svg>
      </div>
    </div>
  );
}
