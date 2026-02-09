import { useState, useLayoutEffect, RefObject } from 'react';

interface UseFitPixelSizeArgs {
  canvasWidth: number;
  canvasHeight: number;
  hudRef: RefObject<HTMLElement | null>;
  footerRef: RefObject<HTMLElement | null>;
}

export function useFitPixelSize({
  canvasWidth,
  canvasHeight,
  hudRef,
  footerRef,
}: UseFitPixelSizeArgs) {
  function compute() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const hudH =
      hudRef.current?.getBoundingClientRect().height ?? 0;
    const footerH =
      footerRef.current?.getBoundingClientRect().height ?? 0;

    const verticalPadding = 16;
    const horizontalPadding = 16;

    const availableH = vh - hudH - footerH - verticalPadding;
    const maxCanvasPxTall = Math.max(availableH, 50);

    const perCellFromH = Math.floor(maxCanvasPxTall / canvasHeight);

    const availableW = vw - horizontalPadding;
    const perCellFromW = Math.floor(availableW / canvasWidth);

    let cell = Math.min(perCellFromH, perCellFromW);

    const isMobile = vw < 640;
    const MAX_CELL = isMobile ? 16 : 20;
    const MIN_CELL = 4;

    if (cell > MAX_CELL) cell = MAX_CELL;
    if (cell < MIN_CELL) cell = MIN_CELL;

    return cell;
  }

  const [size, setSize] = useState<number>(() => compute());

  useLayoutEffect(() => {
    const handleResize = () => {
      setSize(compute());
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    setTimeout(handleResize, 0);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [canvasWidth, canvasHeight]);

  return size;
}
