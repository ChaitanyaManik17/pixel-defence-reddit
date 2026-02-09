import { useEffect, useState } from 'react';
import { WAVE_WARNING_MS } from '../shared/constants';

interface WaveAlertProps {
  isWaveNext: boolean;
  waveStartsAt: number | null;
  waveIntensityPct: number | null;
}

export const WaveAlert = ({
  isWaveNext,
  waveStartsAt,
  waveIntensityPct,
}: WaveAlertProps) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => {
      if (!isWaveNext || !waveStartsAt) {
        setVisible(false);
        return;
      }

      const msLeft = waveStartsAt - Date.now();
      if (msLeft <= 0) {
        // wave already hit
        setVisible(false);
        return;
      }

      // only yell at players if we're within WAVE_WARNING_MS
      if (msLeft > WAVE_WARNING_MS) {
        setVisible(false);
      } else {
        const totalSeconds = Math.floor(msLeft / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        setVisible(true);
      }
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [isWaveNext, waveStartsAt]);

  if (!visible) return null;

  const intensityDisplay =
    waveIntensityPct != null
      ? Math.round(waveIntensityPct * 100)
      : null;

  return (
    <div className="wave-warning text-white font-mono text-xs sm:text-sm text-center bg-red-700/60 border border-red-500 rounded px-2 py-1 w-full max-w-xs">
      <div className="font-bold text-yellow-300 text-sm">
        ⚠ GLITCH WAVE INCOMING
      </div>
      <div>ETA {timeLeft}</div>
      {intensityDisplay !== null && (
        <div className="text-[0.7rem] text-gray-200">
          {intensityDisplay}% damage burst
        </div>
      )}
    </div>
  );
};
