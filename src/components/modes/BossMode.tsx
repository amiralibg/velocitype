import { useEffect, useRef, useState } from 'react';
import type { Difficulty, ModeProps } from '../../lib/types';
import { bossWord } from '../../lib/words';
import { sfx } from '../../lib/sfx';
import { HiddenTypingInput, useTypingEngine } from '../typing/TypingEngine';
import TextDisplay from '../typing/TextDisplay';
import BossScene from '../three/BossScene';
import type { BossFx } from '../three/BossScene';

/**
 * The yeti's rage builds on a timer. Each completed word wounds him AND
 * resets the timer. If his rage peaks, he strikes: one heart gone.
 * Typos don't cost a heart — they cost time.
 */

const MAX_HP: Record<Difficulty, number> = { easy: 80, medium: 100, hard: 130 };
const ATTACK_WINDOW: Record<Difficulty, number> = { easy: 9000, medium: 7000, hard: 5500 };
const DAMAGE_PER_WORD = 10;
const MAX_LIVES = 3;
const TYPO_PENALTY = 0.22; // a typo burns this fraction of the attack window
const FIRST_GRACE = 1.7; // the first wind-up is slower (× window)

export default function BossMode({ difficulty, onFinish, onQuit }: ModeProps) {
  const maxHp = MAX_HP[difficulty];
  const windowMs = ATTACK_WINDOW[difficulty];
  const [hp, setHp] = useState(maxHp);
  const [lives, setLives] = useState(MAX_LIVES);
  const [charge, setCharge] = useState(0);
  const [hurtKey, setHurtKey] = useState(0); // re-triggers flash + shake
  const [hitKey, setHitKey] = useState(0); // re-triggers the floating damage number
  const [typoKey, setTypoKey] = useState(0); // re-triggers the time-penalty notice
  const [outcome, setOutcome] = useState<'win' | 'lose' | null>(null);
  const finishedRef = useRef(false);
  const hpRef = useRef(maxHp);
  const livesRef = useRef(MAX_LIVES);
  const deadlineRef = useRef(0);
  const fx = useRef<BossFx>({ hitAt: 0, attackAt: 0, dead: false, deadAt: 0, charge: 0 });

  const engine = useTypingEngine({
    allowBackspace: false,
    appendIncorrect: false,
    onComplete: () => {
      // Word landed → wound the giant and push the club back down
      fx.current.hitAt = performance.now();
      deadlineRef.current = performance.now() + windowMs;
      sfx.bossHit();
      setHitKey((k) => k + 1);
      const next = Math.max(0, hpRef.current - DAMAGE_PER_WORD);
      hpRef.current = next;
      setHp(next);
      if (next <= 0) {
        fx.current.dead = true;
        fx.current.deadAt = performance.now();
        endGame(true);
      } else {
        engineRef.current.loadText(bossWord(next / maxHp, difficulty));
      }
    },
    onError: () => {
      // Typo → the wrong key is rejected and the club rises faster
      deadlineRef.current -= windowMs * TYPO_PENALTY;
      sfx.error();
      setTypoKey((k) => k + 1);
    },
  });

  const engineRef = useRef(engine);
  engineRef.current = engine;

  function endGame(won: boolean) {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setOutcome(won ? 'win' : 'lose');
    if (won) sfx.win();
    else sfx.lose();
    setTimeout(() => {
      const { wpm, accuracy, errors, elapsedMs } = engineRef.current.stats;
      const damage = maxHp - hpRef.current;
      onFinish({
        mode: 'boss',
        won,
        wpm,
        accuracy,
        errors,
        timeSeconds: elapsedMs / 1000,
        statLabel: 'Damage dealt',
        statValue: `${damage} HP`,
        score: damage + wpm,
      });
    }, 2300);
  }

  useEffect(() => {
    engineRef.current.start(bossWord(1, difficulty));
  }, [difficulty]);

  // Attack timer: drives the club wind-up; on expiry the club falls.
  useEffect(() => {
    deadlineRef.current = performance.now() + windowMs * FIRST_GRACE;
    const id = setInterval(() => {
      if (finishedRef.current) return;
      const now = performance.now();
      const c = Math.min(1, Math.max(0, 1 - (deadlineRef.current - now) / windowMs));
      fx.current.charge = c;
      setCharge(c);
      if (now >= deadlineRef.current) {
        // SLAM
        fx.current.attackAt = now;
        fx.current.charge = 0;
        deadlineRef.current = now + windowMs + 800; // brief recovery after the swing
        sfx.hurt();
        setHurtKey((k) => k + 1);
        const next = livesRef.current - 1;
        livesRef.current = next;
        setLives(next);
        if (next <= 0) endGame(false);
      }
    }, 80);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowMs]);

  // Last-heart heartbeat
  useEffect(() => {
    if (lives !== 1 || outcome) return;
    sfx.heartbeat();
    const id = setInterval(() => sfx.heartbeat(), 1200);
    return () => clearInterval(id);
  }, [lives, outcome]);

  const danger = (MAX_LIVES - lives) / (MAX_LIVES - 1); // 0 → 1 as hearts vanish
  const hpPct = (hp / maxHp) * 100;
  const clubUp = charge > 0.72 && !outcome;

  return (
    <div className="flex h-full flex-col">
      <HiddenTypingInput onKeyDown={outcome ? () => {} : engine.handleKeyDown} />

      {/* ── Forest arena ─────────────────────────────────────── */}
      <div className="relative h-[58%]">
        <BossScene fx={fx} hpFraction={hp / maxHp} danger={outcome === 'lose' ? 1 : danger} />

        {/* hit / hurt overlays */}
        {hurtKey > 0 && (
          <div key={`flash-${hurtKey}`} className="animate-damage-flash pointer-events-none absolute inset-0" />
        )}
        {lives === 1 && !outcome && <div className="danger-vignette" />}

        {/* floating damage number */}
        {hitKey > 0 && !outcome && (
          <div key={`dmg-${hitKey}`} className="damage-float pointer-events-none absolute left-1/2 top-[26%]">
            -{DAMAGE_PER_WORD}
          </div>
        )}

        {/* top strip */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-6">
          <div className="flex flex-col gap-4">
            <button
              onClick={onQuit}
              className="w-fit font-mono text-[11px] uppercase tracking-[0.25em] text-zinc-400 transition-colors hover:text-white"
            >
              ← menu
            </button>
            <div className="flex gap-2 text-3xl leading-none">
              {Array.from({ length: MAX_LIVES }, (_, i) => {
                const alive = i < lives;
                const cls = !alive
                  ? 'animate-heart-shatter text-zinc-800'
                  : lives === 1
                    ? 'animate-heart-beat text-red-500'
                    : 'text-red-500';
                return (
                  <span key={`${i}-${alive}`} className={cls}>
                    ♥
                  </span>
                );
              })}
            </div>
          </div>

          <div className="w-[26rem] font-mono">
            <div className="flex items-baseline justify-between text-[10px] uppercase tracking-[0.3em] text-zinc-400">
              <span>Umrak, the mountain yeti</span>
              <span className="tabular">
                {hp}/{maxHp}
              </span>
            </div>
            <div className="mt-2 h-1 w-full bg-white/15">
              <div
                className="h-full bg-volt transition-all duration-300 ease-out"
                style={{ width: `${hpPct}%` }}
              />
            </div>
            {/* rage — attack telegraph */}
            <div className="mt-3 flex items-center gap-3">
              <span className={`text-[10px] uppercase tracking-[0.3em] ${clubUp ? 'text-red-400' : 'text-zinc-500'}`}>
                rage
              </span>
              <div className="h-1 flex-1 bg-white/10">
                <div
                  className={`h-full ${clubUp ? 'bg-red-500' : 'bg-zinc-400'}`}
                  style={{ width: `${charge * 100}%`, transition: 'width 90ms linear' }}
                />
              </div>
            </div>
          </div>

          <div className="w-20" />
        </div>

        {/* club-up warning */}
        {clubUp && (
          <div className="absolute inset-x-0 bottom-6 flex justify-center">
            <p className="animate-warn-pulse font-mono text-lg font-bold uppercase tracking-[0.35em] text-red-400">
              his rage is peaking — finish the word
            </p>
          </div>
        )}

        {/* typo notice */}
        {typoKey > 0 && !outcome && (
          <div
            key={`typo-${typoKey}`}
            className="damage-float pointer-events-none absolute left-[30%] top-[40%] !text-red-400"
            style={{ fontSize: '1.1rem' }}
          >
            typo — his rage grows
          </div>
        )}

        {/* outcome overlay */}
        {outcome && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/75 backdrop-blur-[3px]">
            <p className="animate-rise-in font-mono text-[11px] uppercase tracking-[0.5em] text-zinc-500">
              {outcome === 'win' ? 'the glade falls silent' : 'the blow landed'}
            </p>
            <span
              className={`animate-pop-in font-display text-8xl font-bold tracking-tight ${
                outcome === 'win' ? 'text-volt' : 'text-red-400'
              }`}
            >
              {outcome === 'win' ? 'FELLED.' : 'CRUSHED.'}
            </span>
          </div>
        )}
      </div>

      {/* ── Typing deck ──────────────────────────────────────── */}
      <div
        key={hurtKey ? `shake-${hurtKey}` : 'steady'}
        className={`mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-10 ${
          hurtKey > 0 && !outcome ? 'animate-screen-shake' : ''
        }`}
      >
        <div className="flex items-center justify-between border-b hairline pb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-600">
          <span>⚔ {engine.stats.wpm} wpm</span>
          <span>03 — boss fight · {difficulty}</span>
          <span>words = damage · typos feed his rage</span>
        </div>
        <div className="flex justify-center py-9">
          <TextDisplay text={engine.text} typed={engine.typed} className="text-5xl tracking-[0.18em]" />
        </div>
        <p
          className={`text-center font-mono text-[10px] uppercase tracking-[0.3em] ${
            lives === 1 ? 'animate-warn-pulse text-red-400' : 'text-zinc-700'
          }`}
        >
          {lives === 1 ? 'one heart left — do not let his rage peak' : 'no backspace · wrong keys are rejected'}
        </p>
      </div>
    </div>
  );
}
