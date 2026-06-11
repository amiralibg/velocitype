import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { ModeProps } from '../../lib/types';
import { randomSentence } from '../../lib/words';
import { sfx } from '../../lib/sfx';
import { HiddenTypingInput, useTypingEngine } from '../typing/TypingEngine';
import TextDisplay from '../typing/TextDisplay';

const TIME_LIMIT = 60; // seconds
const FADE_BEGIN = 2; // seconds after first keystroke: first char starts crumbling
const FADE_SPREAD = 1.4; // last char starts crumbling at FADE_BEGIN + FADE_SPREAD
const FADE_DURATION = 0.6; // everything is gone by 4s
const WRONG_HOLD = 0.7; // wrong letters stay visible this long...
const WRONG_FADE = 0.5; // ...then they crumble too

interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  wobble: number;
  bright: number;
}

export default function DisappearMode({ difficulty, onFinish, onQuit }: ModeProps) {
  const [sentence] = useState(() => randomSentence(difficulty));
  const [elapsed, setElapsed] = useState(0); // seconds since first keystroke
  const startRef = useRef<number | null>(null);
  const finishedRef = useRef(false);
  const wrongAtRef = useRef(new Map<number, number>()); // index -> elapsed when typed wrong
  const invisibleCorrectRef = useRef(0);
  const bonusRef = useRef(0);

  // Thanos-dust machinery
  const textBoxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<DustParticle[]>([]);
  const dustedRef = useRef(new Set<number>());

  const elapsedNow = () =>
    startRef.current === null ? 0 : (performance.now() - startRef.current) / 1000;

  const fadeOpacity = (index: number, t: number): number => {
    const fadeStart = FADE_BEGIN + (index / Math.max(1, sentence.length - 1)) * FADE_SPREAD;
    return Math.min(1, Math.max(0, 1 - (t - fadeStart) / FADE_DURATION));
  };

  const engine = useTypingEngine({
    onCorrectChar: (index) => {
      if (startRef.current === null) startRef.current = performance.now();
      if (fadeOpacity(index, elapsedNow()) <= 0) invisibleCorrectRef.current++;
    },
    onError: (_key, index) => {
      if (startRef.current === null) startRef.current = performance.now();
      wrongAtRef.current.set(index, elapsedNow());
      sfx.error();
    },
    onWordComplete: (word) => {
      // Chars with higher index crumble later, so if the word's last char is
      // gone the whole word was typed from memory.
      const lastIndex = engineRef.current.typed.length - 1;
      if (fadeOpacity(lastIndex, elapsedNow()) <= 0) {
        bonusRef.current += word.length * 5;
      }
    },
    onComplete: () => finish(true),
  });

  const engineRef = useRef(engine);
  engineRef.current = engine;

  function finish(won: boolean) {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (won) sfx.win();
    else sfx.lose();
    setTimeout(() => {
      const { wpm, accuracy, errors, elapsedMs } = engineRef.current.stats;
      const invisibleChars = invisibleCorrectRef.current;
      const multiplier = 1 + invisibleChars / sentence.length;
      onFinish({
        mode: 'disappear',
        won,
        wpm,
        accuracy,
        errors,
        timeSeconds: elapsedMs / 1000,
        statLabel: 'Memory chars',
        statValue: `${invisibleChars}`,
        score: Math.round(wpm * multiplier) + bonusRef.current,
      });
    }, 450);
  }

  /** Spawn a burst of dust at a character's position on the overlay canvas. */
  function dustChar(index: number) {
    const box = textBoxRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas) return;
    const span = box.querySelector(`[data-ti="${index}"]`) as HTMLElement | null;
    if (!span) return;
    const boxRect = box.getBoundingClientRect();
    const r = span.getBoundingClientRect();
    const baseX = r.left - boxRect.left;
    const baseY = r.top - boxRect.top;
    const count = sentence[index] === ' ' ? 2 : 6;
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x: baseX + Math.random() * r.width,
        y: baseY + Math.random() * r.height,
        vx: 26 + Math.random() * 46, // dust streams away to the right
        vy: -34 + Math.random() * 26, // and drifts upward
        life: 0,
        maxLife: 0.8 + Math.random() * 0.7,
        size: 0.9 + Math.random() * 1.7,
        wobble: Math.random() * Math.PI * 2,
        bright: 0.55 + Math.random() * 0.45,
      });
    }
  }

  // Game clock: fades, countdown, and dust spawning at ~20fps.
  useEffect(() => {
    if (!engine.isStarted) return;
    const id = setInterval(() => {
      const t = elapsedNow();
      setElapsed(t);
      // chars whose crumble just began get their dust burst
      for (let i = 0; i < sentence.length; i++) {
        if (!dustedRef.current.has(i) && fadeOpacity(i, t) < 0.92) {
          dustedRef.current.add(i);
          dustChar(i);
        }
      }
      if (t >= TIME_LIMIT) finish(false);
    }, 50);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.isStarted]);

  // Particle renderer (rAF, smooth).
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const canvas = canvasRef.current;
      const box = textBoxRef.current;
      if (!canvas || !box) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const dpr = window.devicePixelRatio || 1;
      const w = box.clientWidth;
      const h = box.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      const g = canvas.getContext('2d');
      if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      const alive: DustParticle[] = [];
      for (const p of particlesRef.current) {
        p.life += dt;
        if (p.life >= p.maxLife) continue;
        const k = p.life / p.maxLife;
        p.x += (p.vx + Math.sin(p.wobble + p.life * 9) * 14) * dt;
        p.y += (p.vy - k * 12) * dt;
        const alpha = (1 - k) * p.bright;
        g.fillStyle = `rgba(226, 228, 218, ${alpha})`;
        const s = p.size * (1 - k * 0.5);
        g.fillRect(p.x, p.y, s, s);
        alive.push(p);
      }
      particlesRef.current = alive;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    engineRef.current.start(sentence);
  }, [sentence]);

  const charStyle = (i: number): CSSProperties | undefined => {
    const { typed } = engine;
    // Wrong letters: visible red briefly, then they crumble too.
    if (i < typed.length && typed[i] !== sentence[i]) {
      const wrongAt = wrongAtRef.current.get(i) ?? 0;
      const o = Math.min(1, Math.max(0, 1 - (elapsed - wrongAt - WRONG_HOLD) / WRONG_FADE));
      return dustStyle(o);
    }
    const o = fadeOpacity(i, elapsed);
    if (i === typed.length) {
      // Current char: hide the glyph as it crumbles but keep the cursor underline.
      return { color: `rgba(82, 82, 91, ${o})`, opacity: 1 };
    }
    return dustStyle(o);
  };

  const timeLeft = Math.max(0, TIME_LIMIT - elapsed);
  const multiplier = 1 + invisibleCorrectRef.current / sentence.length;
  const fadeState = !engine.isStarted
    ? 'ready'
    : elapsed < FADE_BEGIN
      ? 'memorize'
      : elapsed < FADE_BEGIN + FADE_SPREAD + FADE_DURATION
        ? 'fading'
        : 'gone';

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col justify-center px-10">
      <HiddenTypingInput onKeyDown={engine.handleKeyDown} />

      {/* ── Header strip ────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b hairline pb-4 font-mono text-[11px] uppercase tracking-[0.25em] text-mute">
        <button onClick={onQuit} className="transition-colors hover:text-ink">
          ← menu
        </button>
        <span>04 — ghost text · {difficulty}</span>
      </div>

      <div className="flex items-baseline gap-12 py-8 font-mono">
        <div>
          <span
            className={`tabular text-5xl font-bold ${
              timeLeft < 10 ? 'animate-warn-pulse text-red-400' : 'text-ink'
            }`}
          >
            {Math.ceil(timeLeft)}
          </span>
          <span className="ml-2 text-[10px] uppercase tracking-[0.25em] text-mute">sec</span>
        </div>
        <div>
          <span className="tabular text-2xl font-bold text-volt">×{multiplier.toFixed(2)}</span>
          <span className="ml-2 text-[10px] uppercase tracking-[0.25em] text-mute">bonus</span>
        </div>
        <div>
          <span className="tabular text-2xl font-bold text-ink">{engine.stats.wpm}</span>
          <span className="ml-2 text-[10px] uppercase tracking-[0.25em] text-mute">wpm</span>
        </div>
        <span className="ml-auto font-mono text-[11px] uppercase tracking-[0.3em] text-zinc-700">
          {fadeState === 'ready' && 'read it, then type — it will turn to dust'}
          {fadeState === 'memorize' && 'memorize — the dust comes soon'}
          {fadeState === 'fading' && 'it is turning to dust'}
          {fadeState === 'gone' && 'pure memory now'}
        </span>
      </div>

      {/* ── Text + dust overlay ─────────────────────────────── */}
      <div ref={textBoxRef} className="relative border-y hairline py-12">
        <TextDisplay text={engine.text} typed={engine.typed} charStyle={charStyle} className="text-3xl leading-[1.9]" />
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
      </div>

      <p className="pt-6 font-mono text-[11px] uppercase tracking-[0.3em] text-zinc-700">
        Words typed after they crumble score bonus points
      </p>
    </div>
  );
}

/** The glyph itself gets blown away: drifts right, lifts, blurs, vanishes. */
function dustStyle(opacity: number): CSSProperties | undefined {
  if (opacity >= 1) return undefined;
  const gone = 1 - opacity;
  return {
    opacity,
    display: 'inline-block',
    whiteSpace: 'pre',
    filter: `blur(${gone * 2.5}px)`,
    transform: `translate(${gone * 10}px, ${-gone * 6}px) rotate(${gone * 6}deg)`,
  };
}
