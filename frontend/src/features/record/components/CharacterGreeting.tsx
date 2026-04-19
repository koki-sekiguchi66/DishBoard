import { useGreeting } from "../hooks/useGreeting";

export function CharacterGreeting() {
  const { emoji, message } = useGreeting();

  return (
    <div className="flex items-start gap-3 rounded-xl bg-secondary/50 p-3">
      {/* 絵文字アイコン (将来イラストに差替え) */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-xl">
        {emoji}
      </div>
      {/* 吹き出し */}
      <div className="flex-1">
        <p className="text-sm leading-relaxed text-foreground">{message}</p>
        {/* ストリーク 現在はUI枠のみ */}
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">🔥 ストリーク: --日</span>
          <span className="text-xs text-muted-foreground">⭐ Lv.--</span>
        </div>
      </div>
    </div>
  );
}