import { useEffect, useRef, useState } from 'react';
import type { ModeProps } from '../../lib/types';
import { classicParagraph } from '../../lib/words';
import { formatTime } from '../../lib/scoring';
import { sfx } from '../../lib/sfx';
import { HiddenTypingInput, useTypingEngine } from '../typing/TypingEngine';
import TextDisplay from '../typing/TextDisplay';

export default function ClassicMode({ difficulty, onFinish, onQuit }: ModeProps) {
  const [paragraph] = useState(() => classicParagraph(difficulty));
  const finishedRef = useRef(false);

  const engine = useTypingEngine({
    onError: () => sfx.error(),
    onComplete: () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      sfx.win();
      // Read final stats on the next tick so the last keystroke is included.
      setTimeout(() => {
        const { wpm, accuracy, errors, elapsedMs } = engineRef.current.stats;
        onFinish({
          mode: 'classic',
          won: true,
          wpm,
          accuracy,
          errors,
          timeSeconds: elapsedMs / 1000,
          statLabel: 'Characters',
          statValue: `${paragraph.length}`,
          score: Math.round(wpm * (accuracy / 100)),
        });
      }, 450);
    },
  });

  const engineRef = useRef(engine);
  engineRef.current = engine;

  useEffect(() => {
    engineRef.current.start(paragraph);
  }, [paragraph]);

  const { stats } = engine;
  const progress = paragraph.length ? (engine.typed.length / paragraph.length) * 100 : 0;

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col justify-center px-5 md:px-10">
      <HiddenTypingInput engine={engine} />

      {/* ── Header strip ────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b hairline pb-4 font-mono text-[11px] uppercase tracking-[0.25em] text-mute">
        <button onClick={onQuit} className="transition-colors hover:text-ink">
          ← menu
        </button>
        <span>01 — classic · {difficulty}</span>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-3 py-6 font-mono md:gap-12 md:py-8">
        <Stat label="wpm" value={`${stats.wpm}`} big accent />
        <Stat label="accuracy" value={`${stats.accuracy}%`} />
        <Stat label="errors" value={`${stats.errors}`} />
        <Stat label="time" value={formatTime(stats.elapsedMs / 1000)} />
        <div className="flex h-10 w-full items-center md:ml-auto md:w-auto">
          <div className="h-px w-full bg-zinc-800 md:w-40">
            <div className="h-full bg-volt transition-all duration-200" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* ── Text ────────────────────────────────────────────── */}
      <div className="border-y hairline py-6 md:py-12">
        <TextDisplay text={engine.text} typed={engine.typed} className="text-xl leading-[1.9] md:text-3xl" />
      </div>

      <p
        className={`pt-6 font-mono text-[11px] uppercase tracking-[0.3em] text-zinc-700 transition-opacity duration-500 ${
          engine.isStarted ? 'opacity-0' : 'opacity-100'
        }`}
      >
        Tap to focus, then type — the clock starts on your first key
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  big = false,
  accent = false,
}: {
  label: string;
  value: string;
  big?: boolean;
  accent?: boolean;
}) {
  return (
    <div>
      <span
        className={`tabular font-bold ${big ? 'text-4xl md:text-5xl' : 'text-xl md:text-2xl'} ${
          accent ? 'text-volt' : 'text-ink'
        }`}
      >
        {value}
      </span>
      <span className="ml-2 text-[10px] uppercase tracking-[0.25em] text-mute">{label}</span>
    </div>
  );
}
