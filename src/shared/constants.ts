// Canvas dimensions
export const CANVAS_WIDTH = 50;
export const CANVAS_HEIGHT = 50;

// Blank/Glitch color
export const DEFAULT_COLOR = '#FFFFFF';
export const GLITCH_COLOR = '#FFFFFF';
export const GLITCH_OWNER = 'The Glitch';
export const BLANK_OWNER = 'Nobody';

// Decay mechanic settings
export const DECAY_INTERVAL_MS = 60000;      // 1 minute
export const DECAY_PERCENTAGE = 0.02;        // normal glitch ~2%
export const DECAY_PERCENTAGE_WAVE = 0.06;   // wave glitch ~6%
export const WAVE_EVERY = 5;                // every 5th glitch = wave
export const WAVE_WARNING_MS = 30000;        // show warning if wave <30s away

export const ALLOWED_COLORS: string[] = [
  '#FFFFFF', // white
  '#000000', // black
  '#FF4500', // reddit orange
  '#FFD635', // yellow/gold
  '#7317FF', // purple
  '#0079D3', // blue
  '#46A508', // green
  '#F58AC8', // pink
];
