import { useEffect, useMemo, useState } from 'react';
import type { DefenderStat } from '../shared/types/api';

type Props = {
  onStart: () => void;

  integrityPct: number;
  logoCompletionPct: number;
  nextGlitchTime: number;
  isWaveNext: boolean;
  waveStartsAt: number | null;
  topDefenders: DefenderStat[];
};

function fmtPct(n: number) {
  const v = Math.max(0, Math.min(100, Math.round(n)));
  return `${v}%`;
}

function formatCountdown(targetMs: number) {
  const now = Date.now();
  const delta = Math.max(0, targetMs - now);
  const s = Math.floor(delta / 1000);
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${ss.toString().padStart(2, '0')}`;
}

export const SplashScreen = ({
  onStart,
  integrityPct,
  logoCompletionPct,
  nextGlitchTime,
  isWaveNext,
  waveStartsAt,
  topDefenders,
}: Props) => {
  const [timeLeft, setTimeLeft] = useState('0:00');

  const targetTime = useMemo(() => {
    // If a wave is scheduled, count down to that; otherwise to next normal glitch
    if (isWaveNext && waveStartsAt && waveStartsAt > Date.now()) return waveStartsAt;
    return nextGlitchTime;
  }, [isWaveNext, waveStartsAt, nextGlitchTime]);

  useEffect(() => {
    const tick = () => setTimeLeft(formatCountdown(targetTime));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetTime]);

  const waveBadge =
    isWaveNext && waveStartsAt && waveStartsAt > Date.now() ? (
      <span className="px-2 py-0.5 rounded bg-red-600/80 text-white text-xs font-bold ml-2">
        WAVE INCOMING
      </span>
    ) : null;

  const defenders = topDefenders?.slice(0, 3) ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-label="Pixel Canvas Defense entry"
    >
      <div className="splash-card w-[92%] max-w-[720px] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
        {/* Header / art */}
        <div className="h-28 sm:h-36 glitch-bg relative flex items-center">
          <div className="absolute inset-0 bg-gradient-to-r from-[#d93900]/30 via-transparent to-[#ffd700]/20" />
          <h1 className="relative z-10 text-white font-extrabold text-2xl sm:text-3xl tracking-tight px-4 sm:px-6">
            Pixel Canvas Defense
          </h1>
        </div>

        {/* Body */}
        <div className="bg-[#222] px-4 sm:px-6 py-4 flex flex-col gap-4">
          <p className="text-gray-200 text-sm sm:text-base leading-6">
            Your subreddit canvas is under attack by <span className="font-semibold">The Glitch</span>.
            Team up with other redditors to restore the logo before the next corruption hits.
          </p>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="stat-pill">
              <div className="label">Integrity</div>
              <div className={`value ${integrityPct < 40 ? 'text-red-400' : ''}`}>
                {fmtPct(integrityPct)}
              </div>
            </div>
            <div className="stat-pill">
              <div className="label">Logo Intact</div>
              <div className="value text-yellow-300">{fmtPct(logoCompletionPct)}</div>
            </div>
            <div className="stat-pill col-span-2 sm:col-span-1">
              <div className="label">
                {isWaveNext ? 'Next Wave' : 'Next Glitch'}
                {waveBadge}
              </div>
              <div className={`value ${isWaveNext ? 'text-red-400' : 'text-gray-100'}`}>
                {timeLeft}
              </div>
            </div>
            <div className="stat-pill hidden sm:block">
              <div className="label">Mode</div>
              <div className="value text-gray-200">Massively-multiplayer</div>
            </div>
          </div>

          {/* Top defenders */}
          <div className="bg-black/30 rounded-lg p-3 border border-white/10">
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">
              Top Defenders (today)
            </div>
            {defenders.length === 0 ? (
              <div className="text-sm text-gray-300">Be the first to defend!</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {defenders.map((d, i) => (
                  <span
                    key={d.user}
                    className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-white/5 border border-white/10 text-gray-200 text-xs"
                  >
                    <span className="w-5 h-5 rounded-full bg-white/10 grid place-items-center text-[0.7rem]">
                      {i + 1}
                    </span>
                    <span className="font-mono">u/{d.user}</span>
                    <span className="text-gray-400">+{d.placed}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="flex items-center justify-between flex-col sm:flex-row gap-3">
            <button
              className="play-button"
              onClick={onStart}
              aria-label="Start playing Pixel Canvas Defense"
            >
              Tap to Play
            </button>

            <div className="text-[0.8rem] text-gray-400 text-center sm:text-right">
              Tip: Fix red-outlined pixels to restore the logo faster.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
