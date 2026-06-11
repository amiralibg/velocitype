/** Net WPM from correctly typed characters (standard 5 chars = 1 word). */
export function calcWpm(correctChars: number, elapsedMs: number): number {
  if (elapsedMs < 1000) return 0;
  return Math.round(correctChars / 5 / (elapsedMs / 60000));
}

export function calcAccuracy(correctKeystrokes: number, totalKeystrokes: number): number {
  if (totalKeystrokes === 0) return 100;
  return Math.round((correctKeystrokes / totalKeystrokes) * 100);
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
}
