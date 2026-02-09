import { describe, it, expect } from 'vitest';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DEFAULT_COLOR,
} from './constants';
import { CanvasState } from '../shared/types/api';

function createCanvasFromData(data: CanvasState): string[] {
  const pixels = Array(CANVAS_WIDTH * CANVAS_HEIGHT).fill(DEFAULT_COLOR);
  for (const [coord, pixelData] of Object.entries(data)) {
    const [x, y] = coord.split(':').map(Number);
    if (
      x === undefined ||
      y === undefined ||
      !isFinite(x) ||
      !isFinite(y) ||
      x < 0 ||
      x >= CANVAS_WIDTH ||
      y < 0 ||
      y >= CANVAS_HEIGHT
    ) {
      continue;
    }
    const index = y * CANVAS_WIDTH + x;
    pixels[index] = pixelData.color;
  }
  return pixels;
}

describe('createCanvasFromData', () => {
  it('should return a blank canvas when given an empty state', () => {
    const emptyState: CanvasState = {};
    const pixels = createCanvasFromData(emptyState);

    const allDefault = pixels.every((p) => p === DEFAULT_COLOR);
    expect(pixels.length).toBe(CANVAS_WIDTH * CANVAS_HEIGHT);
    expect(allDefault).toBe(true);
  });

  it('should correctly place pixels from an initial state', () => {
    const testState: CanvasState = {
      '0:0': { color: '#FF0000', owner: 'testuser' },
      '10:5': { color: '#00FF00', owner: 'testuser' },
    };
    const pixels = createCanvasFromData(testState);

    expect(pixels[0]).toBe('#FF0000');

    const index = 5 * CANVAS_WIDTH + 10;
    expect(pixels[index]).toBe('#00FF00');

    expect(pixels[1]).toBe(DEFAULT_COLOR);
  });

  it('should ignore out-of-bounds or invalid pixels', () => {
    const testState: CanvasState = {
      '-1:5': { color: '#FF0000', owner: 'testuser' },
      '5:999': { color: '#00FF00', owner: 'testuser' },
      'bad:coord': { color: '#0000FF', owner: 'testuser' },
    };
    const pixels = createCanvasFromData(testState);

    const allDefault = pixels.every((p) => p === DEFAULT_COLOR);
    expect(allDefault).toBe(true);
  });
});
