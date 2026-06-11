import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { GameResult } from '../lib/types';
import { formatTime } from '../lib/scoring';
import { sfx } from '../lib/sfx';

interface ResultsScreenProps {
  result: GameResult;
  isNewBest: boolean;
  onPlayAgain: () => void;
  onChangeMode: () => void;
}

const MODE_NAMES = {
  classic: 'Classic',
  race: 'Night Drive',
  boss: 'Boss Fight',
  disappear: 'Ghost Text',
  code: 'Code',
} as const;

/** Eased count-up from 0 to target over ~0.9s. */
function useCountUp(target: number, delayMs = 250): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now() + delayMs;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - t0) / 900));
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, delayMs]);
  return value;
}

export default function ResultsScreen({ result, isNewBest, onPlayAgain, onChangeMode }: ResultsScreenProps) {
  const wpm = useCountUp(result.wpm);
  const score = useCountUp(result.score, 550);

  const stats = [
    { label: 'Accuracy', value: `${result.accuracy}%` },
    { label: 'Errors', value: `${result.errors}` },
    { label: 'Time', value: formatTime(result.timeSeconds) },
    { label: result.statLabel, value: result.statValue },
  ];

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col px-10 py-7">
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header
        className="animate-rise-in flex items-center justify-between border-b hairline pb-5 font-mono text-[11px] uppercase tracking-[0.25em] text-mute"
        style={{ '--d': '0.05s' } as CSSProperties}
      >
        <span>{MODE_NAMES[result.mode]} — run complete</span>
        <span className={result.won ? 'text-volt' : 'text-red-400'}>
          {result.won ? '● cleared' : '○ failed'}
        </span>
      </header>

      {/* ── Verdict + WPM ───────────────────────────────────── */}
      <div className="flex flex-1 items-center">
        <div className="w-full">
          <div className="flex items-end justify-between gap-8">
            <h1
              className="animate-rise-in font-display text-[clamp(3rem,8vw,7.5rem)] font-bold leading-[0.95] tracking-[-0.04em]"
              style={{ '--d': '0.15s' } as CSSProperties}
            >
              {result.won ? (
                <>
                  Run
                  <br />
                  cleared.
                </>
              ) : (
                <>
                  Not
                  <br />
                  this time.
                </>
              )}
            </h1>
            <div className="animate-rise-in pb-3 text-right" style={{ '--d': '0.3s' } as CSSProperties}>
              <p className={`tabular font-mono text-[clamp(4rem,10vw,9rem)] font-bold leading-none ${result.won ? 'text-volt' : 'text-ink'}`}>
                {wpm}
              </p>
              <p className="mt-1 font-mono text-xs uppercase tracking-[0.4em] text-mute">words / minute</p>
            </div>
          </div>

          {isNewBest && (
            <p
              className="animate-pop-in mt-6 inline-block bg-volt px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-[0.3em] text-coal"
              style={{ animationDelay: '0.6s' }}
            >
              ★ new best score
            </p>
          )}
        </div>
      </div>

      {/* ── Stats strip ─────────────────────────────────────── */}
      <div className="grid grid-cols-4 border-t hairline">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`animate-rise-in py-7 ${i > 0 ? 'border-l hairline pl-8' : ''}`}
            style={{ '--d': `${0.4 + i * 0.07}s` } as CSSProperties}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-mute">{s.label}</p>
            <p className="tabular mt-2 font-mono text-4xl font-bold text-ink">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Actions ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t hairline pt-6 pb-1">
        <p
          className="animate-rise-in font-mono text-[11px] uppercase tracking-[0.25em] text-mute"
          style={{ '--d': '0.75s' } as CSSProperties}
        >
          score&nbsp;·&nbsp;<span className="tabular text-lg font-bold text-ink">{score}</span>
        </p>
        <div className="animate-rise-in flex gap-3" style={{ '--d': '0.85s' } as CSSProperties}>
          <button
            onClick={() => {
              sfx.select();
              onPlayAgain();
            }}
            className="bg-volt px-9 py-3 font-mono text-sm font-bold uppercase tracking-[0.2em] text-coal transition-transform duration-150 hover:-translate-y-0.5"
          >
            Play again
          </button>
          <button
            onClick={() => {
              sfx.select();
              onChangeMode();
            }}
            className="border hairline px-9 py-3 font-mono text-sm font-bold uppercase tracking-[0.2em] text-ink transition-colors duration-150 hover:border-ink"
          >
            Change mode
          </button>
        </div>
      </div>
    </div>
  );
}
