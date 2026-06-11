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
  handleKeyDown: (e: ReactKeyboardEvent<HTMLInputElement>) => void;
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

  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const opts = optionsRef.current;

      if (e.key === 'Backspace') {
        e.preventDefault();
        if (opts.allowBackspace === false || completeRef.current) return;
        if (typedRef.current.length > 0) {
          typedRef.current = typedRef.current.slice(0, -1);
          setTyped(typedRef.current);
          refreshStats();
        }
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        return;
      }
      const key = e.key === 'Enter' ? '\n' : e.key;
      if (key.length !== 1) return;
      e.preventDefault();
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

  return { text, typed, stats, isStarted, isComplete, handleKeyDown, start, loadText };
}

/**
 * Invisible input that captures all typing. Stays focused for the whole game;
 * clicking anywhere re-focuses it.
 */
export function HiddenTypingInput({
  onKeyDown,
}: {
  onKeyDown: (e: ReactKeyboardEvent<HTMLInputElement>) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    const id = setInterval(() => {
      if (document.activeElement !== ref.current) ref.current?.focus();
    }, 250);
    return () => clearInterval(id);
  }, []);

  return (
    <input
      ref={ref}
      className="absolute h-0 w-0 opacity-0"
      autoFocus
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      onKeyDown={onKeyDown}
      onBlur={() => setTimeout(() => ref.current?.focus(), 10)}
      aria-label="Typing input"
    />
  );
}
