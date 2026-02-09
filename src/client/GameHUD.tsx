import { useEffect, useState } from 'react';

interface GameHUDProps {
  username: string;
  integrityPct: number;
  logoCompletionPct: number;
  nextGlitchTime: number;
  isWaveNext: boolean;
  waveStartsAt: number | null;
  waveIntensityPct: number | null;
  yourRank: number | null;
  yourPlaced: number | null;
  activeUsers: string[];
}

export const GameHUD = ({
  username,
  integrityPct,
  logoCompletionPct,
  nextGlitchTime,
  isWaveNext,
  waveStartsAt,
  waveIntensityPct,
  yourRank,
  yourPlaced,
  activeUsers,
}: GameHUDProps) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const msLeft = Math.max(nextGlitchTime - now, 0);
  const totalSec = Math.floor(msLeft / 1000);
  const mm = Math.floor(totalSec / 60).toString();
  const ss = (totalSec % 60).toString().padStart(2, '0');

  const countdownLabel = isWaveNext ? 'WAVE' : 'GLITCH';

  return (
    <header className="app-header game-hud-shell text-white font-mono">
      <div className="flex flex-row justify-between items-center text-xs w-full gap-2">
        <div className="flex flex-row gap-2 items-center flex-shrink min-w-0">
          <span title="Canvas Integrity">
            🛡️ {Math.round(integrityPct)}%
          </span>
          <span title="Logo Completion">
            🎯 {Math.round(logoCompletionPct)}%
          </span>
          <span title="Active Defenders">
            👤 {activeUsers.length}
          </span>
        </div>

        <div
          className={
            'px-2 py-1 rounded text-[11px] font-bold leading-none ' +
            (isWaveNext
              ? 'bg-red-700/80 border border-red-500 text-white'
              : 'bg-black/60 border border-gray-600 text-gray-100')
          }
          title={
            isWaveNext
              ? 'Warning: Incoming Glitch Wave!'
              : 'Time until next Glitch'
          }
        >
          {countdownLabel}: {mm}:{ss}
        </div>
      </div>
    </header>
  );
};
