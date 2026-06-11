export type Mode = 'classic' | 'race' | 'boss' | 'disappear' | 'code';
export type Screen = 'menu' | 'playing' | 'results';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GameResult {
  mode: Mode;
  won: boolean;
  wpm: number;
  accuracy: number;
  errors: number;
  timeSeconds: number;
  /** Mode-specific stat, e.g. "Laps completed" / "2 of 3" */
  statLabel: string;
  statValue: string;
  /** Single number used for the per-mode high score */
  score: number;
}

export interface ModeProps {
  difficulty: Difficulty;
  onFinish: (result: GameResult) => void;
  onQuit: () => void;
}
