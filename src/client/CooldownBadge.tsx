import { useEffect, useState } from 'react';

type Props = {
  cooldownEndsAt: number; // ms timestamp
};

export const CooldownBadge = ({ cooldownEndsAt }: Props) => {
  const [leftMs, setLeftMs] = useState(0);

  useEffect(() => {
    const update = () => {
      const diff = cooldownEndsAt - Date.now();
      setLeftMs(diff > 0 ? diff : 0);
    };
    update();
    const id = window.setInterval(update, 250);
    return () => clearInterval(id);
  }, [cooldownEndsAt]);

  const active = leftMs > 0;
  const secs = Math.ceil(leftMs / 1000);

  return (
    <div
      className={`px-2 py-1 rounded text-xs font-mono border ${
        active
          ? 'bg-gray-800 text-gray-300 border-gray-600'
          : 'bg-green-600 text-black font-bold border-green-400 shadow-[0_0_12px_rgba(0,255,0,0.6)]'
      }`}
      aria-live="polite"
      role="status"
    >
      {active ? `Cooldown: ${secs}s` : 'READY'}
    </div>
  );
};
