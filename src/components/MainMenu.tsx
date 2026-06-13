import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { Difficulty, Mode } from '../lib/types';
import { getBest } from '../lib/storage';
import { sfx } from '../lib/sfx';

interface MainMenuProps {
  difficulty: Difficulty;
  onDifficultyChange: (d: Difficulty) => void;
  onSelectMode: (m: Mode) => void;
}

const MODES: { id: Mode; index: string; name: string; description: string }[] = [
  {
    id: 'classic',
    index: '01',
    name: 'Classic',
    description: 'The timeless test — pure speed, pure accuracy',
  },
  {
    id: 'race',
    index: '02',
    name: 'Night Drive',
    description: 'Your typing is the throttle. Stop, and the engine dies',
  },
  {
    id: 'boss',
    index: '03',
    name: 'Boss Fight',
    description: 'A yeti in the woods — out-type its rising rage',
  },
  {
    id: 'disappear',
    index: '04',
    name: 'Ghost Text',
    description: 'The sentence turns to dust — finish it from memory',
  },
  {
    id: 'code',
    index: '05',
    name: 'Code',
    description: 'Real snippets, real syntax — pick your language',
  },
];

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const TITLE = 'VELOCITYPE';

export default function MainMenu({ difficulty, onDifficultyChange, onSelectMode }: MainMenuProps) {
  const [muted, setMuted] = useState(sfx.muted);

  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col px-5 py-6 md:px-10 md:py-7">
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header
        className="animate-rise-in flex flex-col gap-3 font-mono text-[10px] uppercase tracking-[0.25em] text-mute md:flex-row md:items-center md:justify-between md:text-[11px]"
        style={{ '--d': '0.05s' } as CSSProperties}
      >
        <span>Velocitype&reg; — a typing arcade</span>
        <div className="flex items-center justify-between gap-5 md:justify-end md:gap-7">
          <div className="flex items-center gap-4 md:gap-5">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => {
                  sfx.select();
                  onDifficultyChange(d);
                }}
                className={`uppercase tracking-[0.25em] transition-colors ${
                  difficulty === d
                    ? 'text-volt underline decoration-2 underline-offset-8'
                    : 'text-mute hover:text-ink'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              const next = !muted;
              sfx.setMuted(next);
              setMuted(next);
              if (!next) sfx.select();
            }}
            className="border hairline px-3 py-1 transition-colors hover:border-ink hover:text-ink"
            aria-label="Toggle sound"
          >
            {muted ? 'sound: off' : 'sound: on'}
          </button>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col justify-center py-10 md:py-0">
        <h1 className="select-none whitespace-nowrap font-display text-[clamp(2.75rem,13vw,9rem)] font-bold leading-[0.95] tracking-[-0.04em]">
          {TITLE.split('').map((ch, i) => (
            <span key={i} className="animate-letter-in" style={{ '--d': `${0.1 + i * 0.04}s` } as CSSProperties}>
              {ch}
            </span>
          ))}
        </h1>
        <div
          className="animate-rise-in mt-4 flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between"
          style={{ '--d': '0.6s' } as CSSProperties}
        >
          <p className="text-base text-mute md:text-lg">
            Five games. One keyboard. <span className="text-ink">How fast are you really?</span>
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-mute">
            difficulty&nbsp;·&nbsp;<span className="text-volt">{difficulty}</span>
          </p>
        </div>
      </div>

      {/* ── Mode index ──────────────────────────────────────── */}
      <nav className="border-t hairline">
        {MODES.map((m, i) => {
          const best = getBest(m.id, difficulty);
          return (
            <button
              key={m.id}
              onClick={() => {
                sfx.select();
                onSelectMode(m.id);
              }}
              className="mode-row animate-rise-in group flex w-full items-center gap-4 border-b hairline py-4 text-left md:gap-8 md:py-5"
              style={{ '--d': `${0.7 + i * 0.08}s` } as CSSProperties}
            >
              <span className="font-mono text-xs text-mute md:text-sm">{m.index}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 md:flex-row md:items-center md:gap-8">
                <span className="text-2xl font-bold tracking-tight text-ink md:w-56 md:shrink-0 md:text-3xl">
                  {m.name}
                </span>
                <span className="text-xs text-mute md:flex-1 md:text-sm">{m.description}</span>
                <span className="tabular font-mono text-[10px] uppercase tracking-[0.2em] text-mute md:w-44 md:text-right md:text-[11px]">
                  {best ? `best ${best.score} · ${best.wpm} wpm` : 'no record'}
                </span>
              </div>
              <span className="font-mono text-lg text-mute transition-transform duration-200 group-hover:translate-x-1.5 md:text-xl">
                →
              </span>
            </button>
          );
        })}
      </nav>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer
        className="animate-rise-in flex items-center justify-between gap-4 pt-5 font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-700"
        style={{ '--d': '1.1s' } as CSSProperties}
      >
        <span>Records are stored in your browser</span>
        <span className="hidden text-right sm:block">Keyboard or touch — your call</span>
      </footer>
    </div>
  );
}
