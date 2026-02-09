import { useState, useEffect, useMemo, useRef } from 'react';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DEFAULT_COLOR,
  BLANK_OWNER,
} from './constants';
import {
  CanvasState,
  TargetState,
  PaintRequest,
  CanvasPixelData,
  PaintResponse,
} from '../shared/types/api';

interface PixelGridProps {
  canvasState: CanvasState;
  targetState?: TargetState;
  selectedColor: string;
  username: string;
  cooldownEndsAt: number;
  onPaintSuccess: (newCooldownEndsAt: number) => void;
  isWaveNext?: boolean;
  pixelSize: number;
  isShaking: boolean;
}

type Burst = {
  id: number;
  x: number;
  y: number;
  color: string;
};

type FloatMsg = {
  id: number;
  x: number;
  y: number;
  text: string;
};

function createCanvasFromData(data: CanvasState): CanvasPixelData[] {
  const pixels: CanvasPixelData[] = Array.from(
    { length: CANVAS_WIDTH * CANVAS_HEIGHT },
    () => ({
      color: DEFAULT_COLOR,
      owner: BLANK_OWNER,
    })
  );

  for (const [coord, pixelData] of Object.entries(data)) {
    const [xs, ys] = coord.split(':');
    const x = parseInt(xs ?? '', 10);
    const y = parseInt(ys ?? '', 10);
    if (
      Number.isFinite(x) &&
      Number.isFinite(y) &&
      x >= 0 &&
      x < CANVAS_WIDTH &&
      y >= 0 &&
      y < CANVAS_HEIGHT
    ) {
      const index = y * CANVAS_WIDTH + x;
      pixels[index] = pixelData;
    }
  }

  return pixels;
}

export const PixelGrid = ({
  canvasState,
  targetState,
  selectedColor,
  username,
  cooldownEndsAt,
  onPaintSuccess,
  isWaveNext = false,
  pixelSize,
  isShaking,
}: PixelGridProps) => {
  const [pixels, setPixels] = useState<CanvasPixelData[]>(() =>
    createCanvasFromData(canvasState)
  );
  const [flashingPixel, setFlashingPixel] = useState<number | null>(null);
  const [hoveredOwner, setHoveredOwner] = useState<string>('');
  const [cooldownFlash, setCooldownFlash] = useState(false);
  const [isCooldownActive, setIsCooldownActive] = useState(false);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [floatMsgs, setFloatMsgs] = useState<FloatMsg[]>([]);
  const burstIdRef = useRef(0);
  const floatIdRef = useRef(0);
  const placeSound = useMemo(() => new Audio('/place.wav'), []);
  const denySound = useMemo(() => new Audio('/deny.wav'), []);

  useEffect(() => {
    setPixels(createCanvasFromData(canvasState));
  }, [canvasState]);

  useEffect(() => {
    const checkCooldown = () => {
      const active = cooldownEndsAt > Date.now();
      setIsCooldownActive(active);
    };
    checkCooldown();
    const id = window.setInterval(checkCooldown, 250);
    return () => clearInterval(id);
  }, [cooldownEndsAt]);

  const spawnPaintFX = (gridX: number, gridY: number, color: string, px: number) => {
    const centerLeftPx = gridX * px + px / 2;
    const centerTopPx = gridY * px + px / 2;

    const burstId = burstIdRef.current++;
    setBursts((prev) => [
      ...prev,
      { id: burstId, x: centerLeftPx, y: centerTopPx, color },
    ]);
    window.setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b.id !== burstId));
    }, 400);

    const floatId = floatIdRef.current++;
    setFloatMsgs((prev) => [
      ...prev,
      { id: floatId, x: centerLeftPx, y: centerTopPx, text: '+1' },
    ]);
    window.setTimeout(() => {
      setFloatMsgs((prev) => prev.filter((m) => m.id !== floatId));
    }, 600);
  };

  const sendPaintRequest = async (x: number, y: number, color: string) => {
    const paintData: PaintRequest = { x, y, color };
    try {
      const res = await fetch('/api/paint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paintData),
      });

      if (!res.ok) {
        if (res.status === 429) {
          console.warn('Server said cooldown (429).');
        }
        throw new Error(`Server responded with ${res.status}`);
      }

      const data: PaintResponse = await res.json();
      onPaintSuccess(data.cooldownEndsAt);
    } catch (err) {
      console.error('Failed to paint pixel:', err);
    }
  };

  const handlePixelClick = (index: number) => {
    if (isCooldownActive) {
      setCooldownFlash(true);
      window.setTimeout(() => setCooldownFlash(false), 150);
      denySound.currentTime = 0;
      denySound.play().catch((e) => console.error('deny sound failed:', e));
      return;
    }

    const x = index % CANVAS_WIDTH;
    const y = Math.floor(index / CANVAS_WIDTH);
    const newColor = selectedColor;

    const newPixelData: CanvasPixelData = {
      color: newColor,
      owner: username,
    };

    setPixels((prev) => {
      const nextPixels = [...prev];
      nextPixels[index] = newPixelData;
      return nextPixels;
    });

    setFlashingPixel(index);
    window.setTimeout(() => setFlashingPixel(null), 300);

    placeSound.currentTime = 0;
    placeSound.play().catch((e) => console.error('place sound failed:', e));
    spawnPaintFX(x, y, newColor, pixelSize);

    void sendPaintRequest(x, y, newColor);
  };

  const handlePixelHover = (index: number) => {
    const pixel = pixels[index];
    if (pixel) {
      setHoveredOwner(pixel.owner);
    }
  };

  const gridStyleVars = {
    '--canvas-width': CANVAS_WIDTH,
    '--canvas-height': CANVAS_HEIGHT,
    '--pixel-size': `${pixelSize}px`,
  } as React.CSSProperties;

  const containerDimsStyle = {
    width: CANVAS_WIDTH * pixelSize,
    height: CANVAS_HEIGHT * pixelSize,
  } as React.CSSProperties;

  const wrapperClasses = [
    isShaking ? 'shaking' : '',
    isWaveNext ? 'wave-warning' : '',
    cooldownFlash ? 'cooldown-flash' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex flex-col items-center">
      <div
        className={`relative inline-block ${wrapperClasses}`}
        style={containerDimsStyle}
      >
        <div
          className="pixel-grid"
          style={{
            ...gridStyleVars,
            pointerEvents: isCooldownActive ? 'none' : 'auto',
            opacity: isCooldownActive ? 0.7 : 1.0,
          }}
        >
          {pixels.map((pix, index) => {
            const safePix: CanvasPixelData = pix ?? {
              color: DEFAULT_COLOR,
              owner: BLANK_OWNER,
            };

            const x = index % CANVAS_WIDTH;
            const y = Math.floor(index / CANVAS_WIDTH);
            const coord = `${x}:${y}`;
            const desiredColor = targetState?.[coord];

            const needsDefense =
              desiredColor &&
              safePix.color.toLowerCase() !== desiredColor.toLowerCase();

            return (
              <div
                key={index}
                className={
                  'pixel ' +
                  (flashingPixel === index ? 'flashing ' : '') +
                  (needsDefense ? 'needs-defense ' : '')
                }
                style={{
                  backgroundColor: safePix.color,
                  '--defense-color': needsDefense ? desiredColor : 'transparent',
                  '--defense-color-rgb': needsDefense
                    ? desiredColor.slice(1).match(/.{2}/g)?.map((hex) => parseInt(hex, 16)).join(',')
                    : '0,0,0',
                } as React.CSSProperties}
                onClick={() => handlePixelClick(index)}
                onMouseEnter={() => handlePixelHover(index)}
                onMouseLeave={() => setHoveredOwner('')}
              />
            );
          })}
        </div>

        <div className="pointer-events-none absolute top-0 left-0 w-full h-full overflow-visible">
          {bursts.map((b) => (
            <div
              key={b.id}
              className="paint-burst"
              style={{
                left: b.x,
                top: b.y,
                backgroundColor: b.color,
              }}
            />
          ))}

          {floatMsgs.map((m) => (
            <div
              key={m.id}
              className="paint-float"
              style={{
                left: m.x,
                top: m.y,
              }}
            >
              {m.text}
            </div>
          ))}
        </div>
      </div>

      <div className="attribution-text select-none">
        {hoveredOwner ? `Last colored by: ${hoveredOwner}` : ''}
      </div>
    </div>
  );
};
