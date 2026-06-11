import type { Difficulty, Mode } from './types';

const KEY = 'velocitype-best-scores-v1';

export interface BestScore {
  score: number;
  wpm: number;
  date: string;
}

type Store = Record<string, BestScore>;

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function slot(mode: Mode, difficulty: Difficulty): string {
  return `${mode}:${difficulty}`;
}

export function getBest(mode: Mode, difficulty: Difficulty): BestScore | null {
  return load()[slot(mode, difficulty)] ?? null;
}

/** Saves the score if it beats the stored best. Returns true when it is a new best. */
export function saveBest(mode: Mode, difficulty: Difficulty, score: number, wpm: number): boolean {
  const store = load();
  const key = slot(mode, difficulty);
  const prev = store[key];
  if (prev && prev.score >= score) return false;
  store[key] = { score, wpm, date: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* storage full or unavailable — ignore */
  }
  return true;
}
