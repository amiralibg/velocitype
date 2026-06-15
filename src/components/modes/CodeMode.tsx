import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { ModeProps } from '../../lib/types';
import { LANGUAGES, randomSnippet } from '../../lib/code';
import type { Language } from '../../lib/code';
import { formatTime } from '../../lib/scoring';
import { sfx } from '../../lib/sfx';
import { HiddenTypingInput, useTypingEngine } from '../typing/TypingEngine';
import TextDisplay from '../typing/TextDisplay';

export default function CodeMode({ difficulty, onFinish, onQuit }: ModeProps) {
  const [lang, setLang] = useState<Language | null>(null);
  const [snippet, setSnippet] = useState('');
  const finishedRef = useRef(false);

  const engine = useTypingEngine({
    autoIndent: true,
    onError: () => sfx.error(),
    onComplete: () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      sfx.win();
      setTimeout(() => {
        const { wpm, accuracy, errors, elapsedMs } = engineRef.current.stats;
        const langName = LANGUAGES.find((l) => l.id === langRef.current)?.name ?? 'Code';
        onFinish({
          mode: 'code',
          won: true,
          wpm,
          accuracy,
          errors,
          timeSeconds: elapsedMs / 1000,
          statLabel: 'Language',
          statValue: langName,
          score: Math.round(wpm * (accuracy / 100)),
        });
      }, 450);
    },
  });

  const engineRef = useRef(engine);
  engineRef.current = engine;
  const langRef = useRef<Language | null>(null);
  langRef.current = lang;

  useEffect(() => {
    if (!lang) return;
    const code = randomSnippet(lang, difficulty);
    setSnippet(code);
    engineRef.current.start(code);
  }, [lang, difficulty]);

  const { stats } = engine;
  const progress = snippet.length ? (engine.typed.length / snippet.length) * 100 : 0;
  const meta = LANGUAGES.find((l) => l.id === lang);

  /* ── Language picker ───────────────────────────────────── */
  if (!lang) {
    return (
      <div className="mx-auto flex h-full max-w-4xl flex-col justify-center px-5 md:px-10">
        <div className="flex items-center justify-between border-b hairline pb-4 font-mono text-[11px] uppercase tracking-[0.25em] text-mute">
          <button onClick={onQuit} className="transition-colors hover:text-ink">
            ← menu
          </button>
          <span>05 — code · {difficulty}</span>
        </div>

        <h2 className="animate-rise-in py-8 font-display text-4xl font-bold tracking-tight md:py-10 md:text-5xl">
          Pick your language.
        </h2>

        <nav className="border-t hairline">
          {LANGUAGES.map((l, i) => (
            <button
              key={l.id}
              onClick={() => {
                sfx.select();
                setLang(l.id);
              }}
              className="mode-row animate-rise-in group flex w-full items-center gap-4 border-b hairline py-4 text-left md:gap-8 md:py-5"
              style={{ '--d': `${0.1 + i * 0.07}s` } as CSSProperties}
            >
              <span className="w-12 font-mono text-xs text-mute md:w-14 md:text-sm">{l.ext}</span>
              <span className="flex-1 text-xl font-bold tracking-tight text-ink md:text-2xl">{l.name}</span>
              <span className="font-mono text-xl text-mute transition-transform duration-200 group-hover:translate-x-1.5">
                →
              </span>
            </button>
          ))}
        </nav>

        <p className="pt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-700">
          Enter ends a line · indentation is typed for you
        </p>
      </div>
    );
  }

  /* ── Typing screen ─────────────────────────────────────── */
  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col justify-center px-5 md:px-10">
      <HiddenTypingInput engine={engine} multiline />

      <div className="flex items-center justify-between gap-3 border-b hairline pb-4 font-mono text-[11px] uppercase tracking-[0.25em] text-mute">
        <button onClick={onQuit} className="shrink-0 whitespace-nowrap transition-colors hover:text-ink">
          ← menu
        </button>
        <span className="text-right">
          05 — code · {difficulty} ·{' '}
          <button
            onClick={() => {
              sfx.select();
              setLang(null);
            }}
            className="text-volt transition-opacity hover:opacity-70"
          >
            {meta?.name} ⌄
          </button>
        </span>
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

      {/* code sheet */}
      <div className="border-y hairline">
        <div className="flex items-center justify-between border-b hairline px-4 py-2 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-700 md:px-5">
          <span>snippet{meta?.ext}</span>
          <span>{snippet.split('\n').length} lines</span>
        </div>
        <div className="overflow-x-auto border-l-2 border-volt/60 py-6 pl-4 pr-3 md:py-8 md:pl-6 md:pr-4">
          <TextDisplay text={engine.text} typed={engine.typed} className="text-sm leading-[1.9] md:text-xl" />
        </div>
      </div>

      <p
        className={`pt-6 font-mono text-[11px] uppercase tracking-[0.3em] text-zinc-700 transition-opacity duration-500 ${
          engine.isStarted ? 'opacity-0' : 'opacity-100'
        }`}
      >
        ⏎ ends a line — indentation is typed for you
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
