export type CanvasPixelData = {
  color: string;
  owner: string;
};

export type CanvasState = Record<string, CanvasPixelData>;

export type TargetState = Record<string, string>;

export type DefenderStat = {
  user: string;
  placed: number;
};

export type InitResponse = {
  type: 'init';
  username: string;

  canvasState: CanvasState;
  targetState: TargetState;
  cooldownEndsAt: number;

  nextGlitchTime: number;

  logoCompletionPct: number;
  isModerator: boolean;
};

export type PaintRequest = {
  x: number;
  y: number;
  color: string;
};

export type PaintResponse = {
  status: 'success';
  x: number;
  y: number;
  data: CanvasPixelData;
  cooldownEndsAt: number;
};

export type PaintUpdateMessage = {
  type: 'paint';
  x: number;
  y: number;
  data: CanvasPixelData;
};

export type DecayUpdateMessage = {
  type: 'decay';
  pixels: {
    coord: string;
    data: CanvasPixelData;
  }[];
  isWave: boolean;
};

export type WaveIncomingMessage = {
  type: 'waveIncoming';
  startsAt: number;
  etaMs: number;
  intensityPct: number;
};

export type PresenceUpdateMessage = {
  type: 'presenceUpdate';
  users: string[];
};

export type RealtimeMessage =
  | PaintUpdateMessage
  | DecayUpdateMessage
  | WaveIncomingMessage
  | PresenceUpdateMessage;

export type StatusResponse = {
  integrityPct: number;
  logoCompletionPct: number;
  nextGlitchTime: number;
  topDefenders: DefenderStat[];

  isWaveNext: boolean;
  waveStartsAt: number | null;
  waveIntensityPct: number | null;

  isModerator: boolean;

  yourRank: number | null;
  yourPlaced: number | null;

  activeUsers: string[];
};

export type SetTargetRequest = {
  target: TargetState;
};

export type SetTargetResponse = {
  status: 'success';
  pixelCount: number;
  message: string;
};
