/**
 * 時間帯に応じたメッセージを返すフック
 * 1分ごとに現在時刻を確認し、時間帯に応じたメッセージと絵文字を返す。
 * 将来的にマスコットキャラクターのイラストに差替えるよてい。
 */
import { useState, useEffect, useMemo } from "react";

interface Greeting {
  emoji: string;
  message: string;
}

const GREETINGS: { start: number; end: number; greeting: Greeting }[] = [
  { start: 5, end: 9, greeting: { emoji: "☀️", message: "おはようございます！朝食の記録をしましょう" } },
  { start: 9, end: 11, greeting: { emoji: "🌤️", message: "午前中もがんばりましょう！" } },
  { start: 11, end: 14, greeting: { emoji: "🌞", message: "ランチタイム！昼食を記録しましょう" } },
  { start: 14, end: 17, greeting: { emoji: "⛅", message: "午後もあと少し！間食の記録も忘れずに" } },
  { start: 17, end: 21, greeting: { emoji: "🌅", message: "お疲れさまです！夕食を記録しましょう" } },
  { start: 21, end: 5, greeting: { emoji: "🌙", message: "今日もお疲れさまでした！" } },
];

function getGreetingForHour(hour: number): Greeting {
  for (const { start, end, greeting } of GREETINGS) {
    if (start < end) {
      if (hour >= start && hour < end) return greeting;
    } else {
      if (hour >= start || hour < end) return greeting;
    }
  }
  return { emoji: "👋", message: "DishBoardへようこそ！" };
}

export function useGreeting(): Greeting {
  const [hour, setHour] = useState(() => new Date().getHours());

  useEffect(() => {
    const timer = setInterval(() => {
      setHour(new Date().getHours());
    }, 60_000); 

    return () => clearInterval(timer);
  }, []);

  return useMemo(() => getGreetingForHour(hour), [hour]);
}

// テスト用にエクスポート
export { getGreetingForHour };