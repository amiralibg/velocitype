import { useCallback, useState } from 'react';
import type { Difficulty, GameResult, Mode, Screen } from '../lib/types';
import { saveBest } from '../lib/storage';
import MainMenu from './MainMenu';
import ResultsScreen from './ResultsScreen';
import ClassicMode from './modes/ClassicMode';
import RaceMode from './modes/RaceMode';
import BossMode from './modes/BossMode';
import DisappearMode from './modes/DisappearMode';
import CodeMode from './modes/CodeMode';

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
        <div key={`menu-${session}`} className="h-full animate-fade-in">
          <MainMenu difficulty={difficulty} onDifficultyChange={setDifficulty} onSelectMode={startGame} />
        </div>
      )}
      {screen === 'playing' && (
        <div key={`play-${session}`} className="h-full animate-fade-in">
          <ModeComponent difficulty={difficulty} onFinish={finishGame} onQuit={backToMenu} />
        </div>
      )}
      {screen === 'results' && result && (
        <div key={`results-${session}`} className="h-full animate-fade-in">
          <ResultsScreen result={result} isNewBest={isNewBest} onPlayAgain={playAgain} onChangeMode={backToMenu} />
        </div>
      )}
    </div>
  );
}
