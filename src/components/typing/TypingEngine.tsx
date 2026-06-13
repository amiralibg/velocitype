import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { calcAccuracy, calcWpm } from '../../lib/scoring';

export interface TypingStats {
  wpm: number;
  accuracy: number;
  errors: number;
  elapsedMs: number;
  correctChars: number;
  totalKeystrokes: number;
}

const ZERO_STATS: TypingStats = {
  wpm: 0,
  accuracy: 100,
  errors: 0,
  elapsedMs: 0,
  correctChars: 0,
  totalKeystrokes: 0,
};

export interface TypingEngineOptions {
  /** Default true. Boss mode sets this to false. */
  allowBackspace?: boolean;
  /** Default true. When false, wrong keys are rejected instead of written (boss mode). */
  appendIncorrect?: boolean;
  /** Code mode: after a correct newline, leading indentation is typed for you. */
  autoIndent?: boolean;
  /** Fired when the typed text reaches the full length of the target text. */
  onComplete?: () => void;
  /** Fired on every incorrect keystroke. */
  onError?: (key: string, index: number) => void;
  /** Fired on every correct keystroke. */
  onCorrectChar?: (index: number) => void;
  /** Fired when a full word has been typed with every character correct. */
  onWordComplete?: (word: string) => void;
}

export interface TypingEngine {
  text: string;
  typed: string;
  stats: TypingStats;
  isStarted: boolean;
  isComplete: boolean;
  handleKeyDown: (e: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
  /**
   * Soft-keyboard path: reconcile the engine against the raw value of a text
   * field after an `input` event. Returns the canonical typed string so the
   * field can be mirrored back (rejected keys / disallowed deletes are undone).
   */
  syncFromValue: (value: string) => string;
  /** Full reset with a new target text. The clock starts on the first keystroke. */
  start: (text: string) => void;
  /** Swap in the next text chunk while keeping cumulative WPM/accuracy stats. */
  loadText: (text: string) => void;
}

function countCorrect(typed: string, text: string): number {
  let n = 0;
  for (let i = 0; i < typed.length; i++) if (typed[i] === text[i]) n++;
  return n;
}

export function useTypingEngine(options: TypingEngineOptions = {}): TypingEngine {
  const [text, setText] = useState('');
  const [typed, setTyped] = useState('');
  const [stats, setStats] = useState<TypingStats>(ZERO_STATS);
  const [isStarted, setIsStarted] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const textRef = useRef('');
  const typedRef = useRef('');
  const startTimeRef = useRef<number | null>(null);
  const committedCorrectRef = useRef(0); // correct chars from previously completed chunks
  const errorsRef = useRef(0);
  const correctKeysRef = useRef(0);
  const keystrokesRef = useRef(0);
  const completeRef = useRef(false);

  const refreshStats = useCallback(() => {
    const elapsedMs = startTimeRef.current === null ? 0 : performance.now() - startTimeRef.current;
    const correctChars = committedCorrectRef.current + countCorrect(typedRef.current, textRef.current);
    setStats({
      wpm: calcWpm(correctChars, elapsedMs),
      accuracy: calcAccuracy(correctKeysRef.current, keystrokesRef.current),
      errors: errorsRef.current,
      elapsedMs,
      correctChars,
      totalKeystrokes: keystrokesRef.current,
    });
  }, []);

  // Recompute WPM every second while the clock is running.
  useEffect(() => {
    if (!isStarted || isComplete) return;
    const id = setInterval(refreshStats, 1000);
    return () => clearInterval(id);
  }, [isStarted, isComplete, refreshStats]);

  const start = useCallback((newText: string) => {
    textRef.current = newText;
    typedRef.current = '';
    startTimeRef.current = null;
    committedCorrectRef.current = 0;
    errorsRef.current = 0;
    correctKeysRef.current = 0;
    keystrokesRef.current = 0;
    completeRef.current = false;
    setText(newText);
    setTyped('');
    setStats(ZERO_STATS);
    setIsStarted(false);
    setIsComplete(false);
  }, []);

  const loadText = useCallback((newText: string) => {
    committedCorrectRef.current += countCorrect(typedRef.current, textRef.current);
    textRef.current = newText;
    typedRef.current = '';
    completeRef.current = false;
    setText(newText);
    setTyped('');
    setIsComplete(false);
  }, []);

  /** Apply one character ('\n' for Enter). Shared by the keyboard and touch paths. */
  const commitChar = useCallback(
    (key: string) => {
      const opts = optionsRef.current;
      if (key.length !== 1) return;
      if (completeRef.current) return;

      const index = typedRef.current.length;
      if (index >= textRef.current.length) return;

      if (startTimeRef.current === null) {
        startTimeRef.current = performance.now();
        setIsStarted(true);
      }

      const expected = textRef.current[index];
      const correct = key === expected;
      keystrokesRef.current++;

      if (correct) {
        correctKeysRef.current++;
        typedRef.current += key;
        opts.onCorrectChar?.(index);

        // Code mode: indentation after a newline is typed for you.
        if (opts.autoIndent && expected === '\n') {
          while (textRef.current[typedRef.current.length] === ' ') {
            typedRef.current += ' ';
          }
        }

        // Word boundary: the char just typed is a space, or we hit the end of text.
        const atEnd = typedRef.current.length === textRef.current.length;
        if (expected === ' ' || atEnd) {
          const upto = typedRef.current;
          const wordStart = upto.lastIndexOf(' ', upto.length - 2) + 1;
          const wordEnd = expected === ' ' ? upto.length - 1 : upto.length;
          const word = textRef.current.slice(wordStart, wordEnd);
          let wordCorrect = true;
          for (let i = wordStart; i < wordEnd; i++) {
            if (typedRef.current[i] !== textRef.current[i]) wordCorrect = false;
          }
          if (wordCorrect && word.length > 0) opts.onWordComplete?.(word);
        }
      } else {
        errorsRef.current++;
        opts.onError?.(key, index);
        // A stray Enter is never written — it would wreck the line layout.
        if (opts.appendIncorrect !== false && key !== '\n') typedRef.current += key;
      }

      setTyped(typedRef.current);
      refreshStats();

      if (typedRef.current.length === textRef.current.length && textRef.current.length > 0) {
        completeRef.current = true;
        setIsComplete(true);
        opts.onComplete?.();
      }
    },
    [refreshStats],
  );

  const commitBackspace = useCallback(() => {
    const opts = optionsRef.current;
    if (opts.allowBackspace === false || completeRef.current) return;
    if (typedRef.current.length > 0) {
      typedRef.current = typedRef.current.slice(0, -1);
      setTyped(typedRef.current);
      refreshStats();
    }
  }, [refreshStats]);

  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'Backspace') {
        e.preventDefault();
        commitBackspace();
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        return;
      }
      const key = e.key === 'Enter' ? '\n' : e.key;
      // Non-character keys (Shift, Arrow…) and unidentified soft-keyboard keys
      // fall through to the touch `syncFromValue` path.
      if (key.length !== 1) return;
      e.preventDefault();
      commitChar(key);
    },
    [commitChar, commitBackspace],
  );

  const syncFromValue = useCallback(
    (value: string): string => {
      const prev = typedRef.current;
      // Longest common prefix — everything past it is an edit (delete + insert).
      let p = 0;
      const min = Math.min(prev.length, value.length);
      while (p < min && prev[p] === value[p]) p++;
      for (let i = prev.length; i > p; i--) commitBackspace();
      for (let i = p; i < value.length; i++) commitChar(value[i]);
      return typedRef.current;
    },
    [commitChar, commitBackspace],
  );

  return { text, typed, stats, isStarted, isComplete, handleKeyDown, syncFromValue, start, loadText };
}

/**
 * Off-screen field that captures all typing. On desktop it reads physical
 * `keydown`; on touch devices it reads `input` events (the soft keyboard's
 * `keydown` is unreliable) and mirrors the engine's canonical text back.
 *
 * Stays focused for the whole game. A tap anywhere re-focuses it — and because
 * that runs inside a user gesture, it also opens the mobile keyboard.
 */
export function HiddenTypingInput({
  engine,
  disabled = false,
}: {
  engine: TypingEngine;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const engineRef = useRef(engine);
  engineRef.current = engine;

  // Keep focus, and refocus on any pointer-down so the soft keyboard reopens.
  useEffect(() => {
    const focus = () => ref.current?.focus();
    focus();
    const id = setInterval(() => {
      if (document.activeElement !== ref.current) focus();
    }, 250);
    window.addEventListener('pointerdown', focus);
    return () => {
      clearInterval(id);
      window.removeEventListener('pointerdown', focus);
    };
  }, []);

  // Mirror the engine's canonical typed text into the field so the soft
  // keyboard's value diff (and its Backspace) stays anchored to real progress.
  useEffect(() => {
    const el = ref.current;
    if (el && el.value !== engine.typed) el.value = engine.typed;
  }, [engine.typed]);

  return (
    <textarea
      ref={ref}
      // text-base (16px) keeps iOS from zooming the page on focus
      className="absolute -z-10 h-0 w-0 resize-none border-0 bg-transparent p-0 text-base opacity-0"
      autoFocus
      autoCapitalize="none"
      autoCorrect="off"
      autoComplete="off"
      spellCheck={false}
      inputMode={disabled ? 'none' : 'text'}
      aria-label="Typing input"
      onKeyDown={(e) => {
        if (disabled) {
          e.preventDefault();
          return;
        }
        engineRef.current.handleKeyDown(e);
      }}
      onInput={(e) => {
        const el = e.currentTarget;
        if (disabled) {
          el.value = engineRef.current.typed;
          return;
        }
        const canonical = engineRef.current.syncFromValue(el.value);
        // Re-anchor the field to canonical text (undo rejected keys / deletes).
        if (el.value !== canonical) el.value = canonical;
      }}
      onBlur={() => setTimeout(() => ref.current?.focus(), 10)}
    />
  );
}
