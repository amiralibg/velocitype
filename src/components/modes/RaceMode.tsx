import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Difficulty, ModeProps } from '../../lib/types';
import { randomRaceSentence } from '../../lib/words';
import { sfx } from '../../lib/sfx';
import { HiddenTypingInput, useTypingEngine } from '../typing/TypingEngine';
import TextDisplay from '../typing/TextDisplay';
import RaceTrack from '../three/RaceTrack';
import type { DriveControl } from '../three/RaceTrack';

/**
 * Endless highway: your recent typing speed is the throttle.
 * Stop typing and the car coasts to a stop — distance is your score.
 */

const TUNING: Record<Difficulty, { windowMs: number; kphPerWpm: number; goalKm: number }> = {
  easy: { windowMs: 4500, kphPerWpm: 1.9, goalKm: 1.0 },
  medium: { windowMs: 3500, kphPerWpm: 1.6, goalKm: 1.5 },
  hard: { windowMs: 2800, kphPerWpm: 1.35, goalKm: 2.0 },
};

const WORD_BOOST_KPH = 22;
const BOOST_DECAY = 0.9; // per second, exponential
const ERROR_SLOW_MS = 900;
const ERROR_SLOW_FACTOR = 0.35;
const MAX_KPH = 260;

export default function RaceMode({ difficulty, onFinish, onQuit }: ModeProps) {
  const tuning = TUNING[difficulty];
  const [countdown, setCountdown] = useState(3);
  const [stopped, setStopped] = useState(false);
  const [hud, setHud] = useState({ kph: 0, meters: 0, stalling: false });
  const finishedRef = useRef(false);

  const keyTimesRef = useRef<number[]>([]);
  const boostRef = useRef({ value: 0, last: performance.now() });
  const slowUntilRef = useRef(0);

  const engine = useTypingEngine({
    onCorrectChar: () => {
      keyTimesRef.current.push(performance.now());
    },
    onWordComplete: () => {
      boostRef.current.value += WORD_BOOST_KPH;
      sfx.boost();
    },
    onError: () => {
      slowUntilRef.current = performance.now() + ERROR_SLOW_MS;
      sfx.error();
    },
    onComplete: () => {
      engineRef.current.loadText(randomRaceSentence());
    },
  });

  const engineRef = useRef(engine);
  engineRef.current = engine;

  const ctrl = useRef<DriveControl>({
    getTargetSpeed: () => {
      const now = performance.now();
      // rolling WPM over the last few seconds — this is the throttle
      const times = keyTimesRef.current;
      while (times.length && now - times[0] > tuning.windowMs) times.shift();
      const recentWpm = (times.length / 5) * (60000 / tuning.windowMs);

      const boost = boostRef.current;
      boost.value *= Math.exp((-(now - boost.last) / 1000) * BOOST_DECAY);
      boost.last = now;

      let kph = recentWpm * tuning.kphPerWpm + boost.value;
      if (now < slowUntilRef.current) kph *= ERROR_SLOW_FACTOR;
      return Math.min(MAX_KPH, kph) / 3.6; // → m/s
    },
    started: false,
    finished: false,
    speed: 0,
    distance: 0,
    braking: false,
  });

  // 3 · 2 · 1 · GO
  useEffect(() => {
    engineRef.current.start(randomRaceSentence());
    sfx.countdown();
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(id);
          ctrl.current.started = true;
          sfx.go();
          return 0;
        }
        sfx.countdown();
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // HUD refresh at 10fps
  useEffect(() => {
    const id = setInterval(() => {
      const c = ctrl.current;
      setHud({
        kph: Math.round(c.speed * 3.6),
        meters: c.distance,
        stalling: c.started && !c.finished && c.getTargetSpeed() < 2 && c.speed > 0.5,
      });
    }, 100);
    return () => clearInterval(id);
  }, []);

  const handleStop = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setStopped(true);
    sfx.engineStall();
    setTimeout(() => {
      const { wpm, accuracy, errors, elapsedMs } = engineRef.current.stats;
      const meters = ctrl.current.distance;
      const km = meters / 1000;
      const won = km >= tuning.goalKm;
      if (won) sfx.win();
      else sfx.lose();
      onFinish({
        mode: 'race',
        won,
        wpm,
        accuracy,
        errors,
        timeSeconds: elapsedMs / 1000,
        statLabel: 'Distance',
        statValue: `${km.toFixed(2)} km`,
        score: Math.round(meters),
      });
    }, 2200);
  }, [onFinish, tuning.goalKm]);

  const km = hud.meters / 1000;
  const goalPct = Math.min(100, (km / tuning.goalKm) * 100);
  const goalReached = goalPct >= 100;

  return (
    <div className="flex h-full flex-col">
      <HiddenTypingInput engine={engine} disabled={countdown > 0 || stopped} />

      {/* ── Highway ──────────────────────────────────────────── */}
      <div className="relative h-[44%] md:h-[58%]">
        <RaceTrack ctrl={ctrl} onStop={handleStop} />

        {/* top strip */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4 md:p-6">
          <div className="flex flex-col gap-4">
            <button
              onClick={onQuit}
              className="w-fit font-mono text-[11px] uppercase tracking-[0.25em] text-zinc-400 transition-colors hover:text-white"
            >
              ← menu
            </button>
            <div className="font-mono">
              <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                goal · {tuning.goalKm.toFixed(1)} km
                {goalReached && <span className="ml-2 text-volt">● reached</span>}
              </p>
              <div className="mt-2 h-px w-44 bg-white/15">
                <div
                  className={`h-full transition-all duration-300 ${goalReached ? 'bg-volt' : 'bg-white'}`}
                  style={{ width: `${goalPct}%` }}
                />
              </div>
            </div>
          </div>
          <div className="text-right font-mono">
            <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">distance</p>
            <p className="tabular mt-1 text-2xl font-bold text-white md:text-3xl">
              {km.toFixed(2)}
              <span className="ml-1.5 text-sm font-normal text-zinc-500">km</span>
            </p>
          </div>
        </div>

        {/* speedometer */}
        <div className="absolute bottom-4 right-4 text-right font-mono md:bottom-6 md:right-6">
          <p
            className={`tabular text-4xl font-bold leading-none md:text-7xl ${
              hud.stalling ? 'animate-warn-pulse text-red-400' : 'text-white'
            }`}
          >
            {hud.kph}
          </p>
          <p className="mt-1.5 text-[10px] uppercase tracking-[0.4em] text-zinc-500">km/h</p>
        </div>

        {/* stall warning */}
        {hud.stalling && !stopped && countdown === 0 && (
          <div className="absolute inset-x-0 bottom-7 flex justify-center px-4">
            <p className="animate-warn-pulse text-center font-mono text-sm font-bold uppercase tracking-[0.35em] text-red-400 md:text-lg">
              keep typing — engine dying
            </p>
          </div>
        )}

        {/* countdown */}
        {countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span
              key={countdown}
              className="animate-pop-in font-mono text-7xl font-bold leading-none text-white md:text-[11rem]"
            >
              {countdown}
            </span>
          </div>
        )}
        {countdown === 0 && !engine.isStarted && !stopped && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="animate-pop-in font-mono text-4xl font-bold tracking-tight text-volt md:text-6xl">
              GO — TYPE
            </span>
          </div>
        )}

        {/* run-over overlay */}
        {stopped && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-[3px]">
            <p
              className="animate-rise-in font-mono text-[11px] uppercase tracking-[0.5em] text-zinc-500"
              style={{ '--d': '0.05s' } as CSSProperties}
            >
              engine stalled
            </p>
            <p className="animate-pop-in tabular mt-4 font-mono text-6xl font-bold leading-none text-white md:text-9xl">
              {km.toFixed(2)}
              <span className="text-2xl font-normal text-zinc-500 md:text-3xl"> km</span>
            </p>
            <p
              className={`animate-rise-in mt-6 font-mono text-sm font-bold uppercase tracking-[0.35em] ${
                goalReached ? 'text-volt' : 'text-red-400'
              }`}
              style={{ '--d': '0.4s' } as CSSProperties}
            >
              {goalReached ? '● goal reached — run cleared' : `○ short of the ${tuning.goalKm.toFixed(1)} km goal`}
            </p>
          </div>
        )}
      </div>

      {/* ── Typing deck ──────────────────────────────────────── */}
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-5 md:px-10">
        <div className="flex items-center justify-between gap-3 border-b hairline pb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-600">
          <span className="hidden sm:inline">words = boost</span>
          <span>02 — night drive · {difficulty}</span>
          <span className="hidden sm:inline">typos = drag</span>
        </div>
        <div className="py-5 md:py-8">
          <TextDisplay text={engine.text} typed={engine.typed} className="text-xl md:text-2xl" />
        </div>
      </div>
    </div>
  );
}
