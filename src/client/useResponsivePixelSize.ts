import { useState, useEffect } from 'react';

export function useResponsivePixelSize(canvasWidth: number) {
  const [pxSize, setPxSize] = useState<number>(8);

  useEffect(() => {
    const compute = () => {
      const vw = window.innerWidth;

      const maxGridWidth = vw - 32;

      const sizeByWidth = Math.floor(maxGridWidth / canvasWidth);

      const clamped = Math.max(6, Math.min(12, sizeByWidth));

      setPxSize(clamped);
    };

    compute();

    window.addEventListener('resize', compute);
    return () => {
      window.removeEventListener('resize', compute);
    };
  }, [canvasWidth]);

  return pxSize;
}
