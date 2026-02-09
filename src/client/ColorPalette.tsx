// src/client/ColorPalette.tsx
import { useEffect, useState } from 'react';

interface ColorPaletteProps {
  selectedColor: string;
  onColorChange: (color: string) => void;

  cooldownEndsAt: number;
  onCooldownEnd: () => void;
}

const COLORS = [
  '#ffffff',
  '#000000',
  '#ff4500',
  '#ffd700',
  '#7a00ff',
  '#19a7ff',
  '#4caf50',
  '#f26bb5',
];

export const ColorPalette = ({
  selectedColor,
  onColorChange,
  cooldownEndsAt,
  onCooldownEnd,
}: ColorPaletteProps) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 250);
    return () => clearInterval(id);
  }, []);

  const msLeft = Math.max(cooldownEndsAt - now, 0);
  const secLeft = Math.ceil(msLeft / 1000);

  const isCoolingDown = msLeft > 0;

  useEffect(() => {
    if (!isCoolingDown) {
      onCooldownEnd();
    }
  }, [isCoolingDown, onCooldownEnd]);

  if (isCoolingDown) {
    return (
      <div className="ui-card flex flex-col items-center text-white font-mono">
        <div className="cooldown-timer">
          {secLeft}s
        </div>
      </div>
    );
  }

  return (
    <div className="ui-card flex flex-col items-center text-white font-mono">
      <div className="flex flex-wrap justify-center gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            className={
              'color-swatch ' + (selectedColor === c ? 'selected' : '')
            }
            style={{ backgroundColor: c }}
            onClick={() => onColorChange(c)}
            aria-label={`Select color ${c}`}
          />
        ))}
      </div>
    </div>
  );
};
