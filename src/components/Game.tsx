import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Difficulty, GameResult, Mode, Screen } from '../lib/types';
import { saveBest } from '../lib/storage';
import MainMenu from './MainMenu';
import ResultsScreen from './ResultsScreen';
import ClassicMode from './modes/ClassicMode';
import RaceMode from './modes/RaceMode';
import BossMode from './modes/BossMode';
import DisappearMode from './modes/DisappearMode';
import CodeMode from './modes/CodeMode';

/**
 * Tracks the *visible* viewport height. On mobile the soft keyboard shrinks
 * `visualViewport` (or overlays it on iOS); sizing the playing screen to this
 * keeps the typing deck above the keyboard instead of hidden behind it.
 */
function useVisualViewportHeight(): number | null {
  const [height, setHeight] = useState<number | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setHeight(vv.height);
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);
  return height;
}

export default function Game() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [mode, setMode] = useState<Mode>('classic');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [result, setResult] = useState<GameResult | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [session, setSession] = useState(0); // bumped to remount a mode for "play again"

  const startGame = useCallback((m: Mode) => {
    setMode(m);
    setSession((s) => s + 1);
    setScreen('playing');
  }, []);

  const finishGame = useCallback(
    (r: GameResult) => {
      setIsNewBest(saveBest(r.mode, difficulty, r.score, r.wpm));
      setResult(r);
      setScreen('results');
    },
    [difficulty],
  );

  const viewportHeight = useVisualViewportHeight();

  const backToMenu = useCallback(() => setScreen('menu'), []);

  const playAgain = useCallback(() => {
    setSession((s) => s + 1);
    setScreen('playing');
  }, []);

  const ModeComponent = {
    classic: ClassicMode,
    race: RaceMode,
    boss: BossMode,
    disappear: DisappearMode,
    code: CodeMode,
  }[mode];

  return (
    <div className="h-full w-full overflow-hidden">
      {screen === 'menu' && (
        <div key={`menu-${session}`} className="h-full animate-fade-in overflow-y-auto">
          <MainMenu difficulty={difficulty} onDifficultyChange={setDifficulty} onSelectMode={startGame} />
        </div>
      )}
      {screen === 'playing' && (
        <div
          key={`play-${session}`}
          className="animate-fade-in"
          style={{ height: viewportHeight ? `${viewportHeight}px` : '100%' } as CSSProperties}
        >
          <ModeComponent difficulty={difficulty} onFinish={finishGame} onQuit={backToMenu} />
        </div>
      )}
      {screen === 'results' && result && (
        <div key={`results-${session}`} className="h-full animate-fade-in overflow-y-auto">
          <ResultsScreen result={result} isNewBest={isNewBest} onPlayAgain={playAgain} onChangeMode={backToMenu} />
        </div>
      )}
    </div>
  );
}
