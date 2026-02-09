import { useState, useEffect, useMemo } from 'react';

export interface CountdownTimerProps {
  nextGlitchTime: number;      // timestamp (ms) for normal glitch
  isWaveNext?: boolean;        // true if a wave is incoming
  waveStartsAt?: number | null; // timestamp (ms) for the next wave, or null
  onTimerEnd: () => void;
}

export const CountdownTimer = ({
  nextGlitchTime,
  isWaveNext = false,
  waveStartsAt = null,
  onTimerEnd,
}: CountdownTimerProps) => {
  // which timestamp are we counting down to?
  const targetTs = useMemo(() => {
    if (isWaveNext && waveStartsAt && waveStartsAt > Date.now()) {
      return waveStartsAt;
    }
    return nextGlitchTime;
  }, [isWaveNext, waveStartsAt, nextGlitchTime]);

  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    let interval: number | null = null;

    const updateTimer = () => {
      const remainingMs = targetTs - Date.now();

      if (remainingMs <= 0) {
        setTimeLeft('0:00');
        onTimerEnd();
        if (interval !== null) clearInterval(interval);
        return;
      }

      const totalSeconds = Math.floor(remainingMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    interval = window.setInterval(updateTimer, 1000);

    return () => {
      if (interval !== null) clearInterval(interval);
    };
  }, [targetTs, onTimerEnd]);

  // pulse red under 10s
  const urgent = useMemo(() => {
    const diff = targetTs - Date.now();
    return diff <= 10_000; // 10s
  }, [targetTs, timeLeft]);

  const label = isWaveNext ? 'Wave In' : 'Glitch In';

  return (
    <div
      className={`text-xs sm:text-sm font-mono px-2 py-1 rounded border ${
        urgent
          ? 'bg-red-700 text-white border-red-400 animate-pulse'
          : 'bg-black/50 text-white border-white/20'
      }`}
      aria-live="polite"
      role="status"
    >
      {label}: {timeLeft}
    </div>
  );
};
