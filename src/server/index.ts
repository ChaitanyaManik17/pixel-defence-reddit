import express from 'express';
import {
  InitResponse,
  PaintRequest,
  PaintResponse,
  StatusResponse,
  SetTargetRequest,
  SetTargetResponse,
  CanvasState,
  DefenderStat,
  PaintUpdateMessage,
  DecayUpdateMessage,
  WaveIncomingMessage,
  TargetState,
  PresenceUpdateMessage,
} from '../shared/types/api';
import {
  redis,
  reddit,
  realtime,
  createServer,
  context,
  getServerPort,
} from '@devvit/web/server';
import { createPost } from './core/post';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DECAY_INTERVAL_MS,
  DECAY_PERCENTAGE,
  DECAY_PERCENTAGE_WAVE,
  WAVE_EVERY,
  GLITCH_COLOR,
  GLITCH_OWNER,
} from '../shared/constants';

const CANVAS_REDIS_KEY = 'canvas:main';
const NEXT_GLITCH_TIME_KEY = 'nextGlitchTime';
const INTEGRITY_REDIS_KEY = 'canvas:integrityPct';
const STATS_REDIS_KEY = 'stats:pixelsPlaced';

const GLITCH_COUNTER_KEY = 'glitchCounter';
const WAVE_STARTS_AT_KEY = 'waveStartsAt';
const WAVE_INTENSITY_KEY = 'waveIntensityPct';

const PRESENCE_REDIS_KEY = 'presence:lastSeen';
const PRESENCE_WINDOW_MS = 15000;

const TARGET_REDIS_KEY = 'canvas:target';

const USER_COOLDOWN_SECONDS = 10;
const getUserCooldownKey = (username: string) => `cooldown:${username}`;

const REALTIME_CHANNEL = 'canvas-updates';

const app = express();
app.use(express.json());
const router = express.Router();

async function getNextGlitchTime(): Promise<number> {
  let nextTime = await redis.get(NEXT_GLITCH_TIME_KEY);
  if (!nextTime) {
    const newTime = Date.now() + DECAY_INTERVAL_MS;
    await redis.set(NEXT_GLITCH_TIME_KEY, newTime.toString());
    return newTime;
  }
  return parseInt(nextTime, 10);
}

async function isCurrentUserModerator(): Promise<boolean> {
  const subredditName = context.subredditName;
  const username = await reddit.getCurrentUsername();

  if (!subredditName || !username) {
    return false;
  }

  try {
    const api: any = (context as any).reddit ?? (reddit as any);
    const mods = await api
      .getModerators({ subredditName, username })
      .all?.();

    if (Array.isArray(mods) && mods.length > 0) {
      return true;
    }
  } catch (err) {
    console.error('Moderator check failed:', err);
  }

  return false;
}

async function getCanvasState(): Promise<CanvasState> {
  const canvasData = await redis.hGetAll(CANVAS_REDIS_KEY);
  const parsed: CanvasState = {};
  if (canvasData) {
    for (const [coord, dataString] of Object.entries(canvasData)) {
      if (typeof dataString === 'string') {
        try {
          parsed[coord] = JSON.parse(dataString);
        } catch (e) {
          console.error(`Failed to parse pixel data for ${coord}:`, e);
        }
      }
    }
  }
  return parsed;
}

async function getTargetState(): Promise<TargetState> {
  const raw = await redis.hGetAll(TARGET_REDIS_KEY);
  const out: TargetState = {};
  if (raw) {
    for (const [coord, color] of Object.entries(raw)) {
      if (typeof color === 'string') {
        out[coord] = color;
      }
    }
  }
  return out;
}

async function recalcAndPersistIntegrity(): Promise<number> {
  const totalPixels = CANVAS_WIDTH * CANVAS_HEIGHT;
  const canvasHash = await redis.hGetAll(CANVAS_REDIS_KEY);

  let glitchPixels = 0;
  for (const dataString of Object.values(canvasHash ?? {})) {
    if (typeof dataString !== 'string') continue;
    try {
      const parsed = JSON.parse(dataString) as { owner?: string };
      if (parsed.owner === GLITCH_OWNER) {
        glitchPixels++;
      }
    } catch {
    }
  }

  const healthyPixels = totalPixels - glitchPixels;
  const pct = (healthyPixels / totalPixels) * 100;
  await redis.set(INTEGRITY_REDIS_KEY, pct.toString());
  return pct;
}

async function calcLogoCompletionPct(
  canvas: CanvasState | null,
  target: TargetState | null
): Promise<number> {
  const t = target ?? (await getTargetState());
  const c = canvas ?? (await getCanvasState());

  const entries = Object.entries(t);
  if (entries.length === 0) return 100;

  let match = 0;
  for (const [coord, desiredColor] of entries) {
    const live = c[coord];
    if (live && live.color?.toLowerCase() === desiredColor.toLowerCase()) {
      match++;
    }
  }

  return (match / entries.length) * 100;
}

async function getTopDefenders(): Promise<DefenderStat[]> {
  const raw = await redis.hGetAll(STATS_REDIS_KEY);
  if (!raw) return [];

  const arr: DefenderStat[] = Object.entries(raw).map(([user, placedStr]) => {
    const placedNum = parseInt(placedStr ?? '0', 10);
    return {
      user,
      placed: Number.isFinite(placedNum) ? placedNum : 0,
    };
  });

  arr.sort((a, b) => b.placed - a.placed);
  return arr.slice(0, 5);
}

async function getFullLeaderboard(): Promise<DefenderStat[]> {
  const raw = await redis.hGetAll(STATS_REDIS_KEY);
  if (!raw) return [];

  const arr: DefenderStat[] = Object.entries(raw).map(([user, placedStr]) => {
    const placedNum = parseInt(placedStr ?? '0', 10);
    return {
      user,
      placed: Number.isFinite(placedNum) ? placedNum : 0,
    };
  });

  arr.sort((a, b) => b.placed - a.placed);
  return arr;
}

async function getUserRank(username: string | null): Promise<{
  yourRank: number | null;
  yourPlaced: number | null;
}> {
  if (!username) {
    return { yourRank: null, yourPlaced: null };
  }

  const leaderboard = await getFullLeaderboard();
  let rank: number | null = null;
  let placed: number | null = null;

  for (let i = 0; i < leaderboard.length; i++) {
    const entry = leaderboard[i];
    if (!entry) continue;

    if (entry.user === username) {
      rank = i + 1;
      placed = entry.placed;
      break;
    }
  }

  return {
    yourRank: rank,
    yourPlaced: placed,
  };
}



async function incrementUserPlacement(username: string): Promise<void> {
  const all = await redis.hGetAll(STATS_REDIS_KEY);
  const curr = all && all[username] ? parseInt(all[username], 10) : 0;
  const nextVal = Number.isFinite(curr) ? curr + 1 : 1;

  await redis.hSet(STATS_REDIS_KEY, {
    [username]: nextVal.toString(),
  });
}

async function getActiveUsers(): Promise<string[]> {
  const raw = await redis.hGetAll(PRESENCE_REDIS_KEY);

  const now = Date.now();
  const recent: { user: string; ts: number }[] = [];

  if (raw) {
    for (const [user, tsStr] of Object.entries(raw)) {
      const tsNum = parseInt(tsStr ?? '0', 10);
      if (
        Number.isFinite(tsNum) &&
        now - tsNum <= PRESENCE_WINDOW_MS
      ) {
        recent.push({ user, ts: tsNum });
      }
    }
  }

  recent.sort((a, b) => b.ts - a.ts);
  return recent.map((r) => r.user).slice(0, 10);
}

async function markUserActive(username: string): Promise<string[]> {
  const now = Date.now().toString();
  await redis.hSet(PRESENCE_REDIS_KEY, {
    [username]: now,
  });
  return await getActiveUsers();
}


async function checkAndRunDecay() {
  const nextGlitchTime = await getNextGlitchTime();
  if (Date.now() >= nextGlitchTime) {
    await runDecayMechanic();
  }
}

async function runDecayMechanic() {
  console.log('Running decay mechanic...');

  let glitchCounterStr = await redis.get(GLITCH_COUNTER_KEY);
  let glitchCounter = glitchCounterStr ? parseInt(glitchCounterStr, 10) : 0;
  glitchCounter += 1;
  await redis.set(GLITCH_COUNTER_KEY, glitchCounter.toString());

  const isWave = glitchCounter % WAVE_EVERY === 0;
  const decayPercent = isWave ? DECAY_PERCENTAGE_WAVE : DECAY_PERCENTAGE;

  const totalPixels = CANVAS_WIDTH * CANVAS_HEIGHT;
  const pixelsToDecay = Math.floor(totalPixels * decayPercent);

  let pixelsAffected = 0;
  const redisUpdateBatch: Record<string, string> = {};
  const broadcastPixels: DecayUpdateMessage['pixels'] = [];

  const glitchData = { color: GLITCH_COLOR, owner: GLITCH_OWNER };

  while (pixelsAffected < pixelsToDecay) {
    const startX = Math.floor(Math.random() * CANVAS_WIDTH);
    const startY = Math.floor(Math.random() * CANVAS_HEIGHT);
    const clusterWidth = Math.ceil(Math.random() * 5);
    const clusterHeight = Math.ceil(Math.random() * 5);

    for (let x = startX; x < startX + clusterWidth; x++) {
      for (let y = startY; y < startY + clusterHeight; y++) {
        if (
          pixelsAffected >= pixelsToDecay ||
          x >= CANVAS_WIDTH ||
          y >= CANVAS_HEIGHT
        ) {
          continue;
        }

        const coord = `${x}:${y}`;
        redisUpdateBatch[coord] = JSON.stringify(glitchData);
        broadcastPixels.push({ coord, data: glitchData });
        pixelsAffected++;
      }
    }
  }

  await redis.hSet(CANVAS_REDIS_KEY, redisUpdateBatch);

  await recalcAndPersistIntegrity();

  const decayPayload: DecayUpdateMessage = {
    type: 'decay',
    pixels: broadcastPixels,
    isWave,
  };
  void realtime.send(REALTIME_CHANNEL, decayPayload);

  const nextTime = Date.now() + DECAY_INTERVAL_MS;
  await redis.set(NEXT_GLITCH_TIME_KEY, nextTime.toString());

  const nextIsWave = ((glitchCounter + 1) % WAVE_EVERY === 0);
  if (nextIsWave) {
    await Promise.all([
      redis.set(WAVE_STARTS_AT_KEY, nextTime.toString()),
      redis.set(WAVE_INTENSITY_KEY, DECAY_PERCENTAGE_WAVE.toString()),
    ]);

    const warnPayload: WaveIncomingMessage = {
      type: 'waveIncoming',
      startsAt: nextTime,
      etaMs: nextTime - Date.now(),
      intensityPct: DECAY_PERCENTAGE_WAVE,
    };
    void realtime.send(REALTIME_CHANNEL, warnPayload);
  } else {
    await Promise.all([
      redis.set(WAVE_STARTS_AT_KEY, '0'),
      redis.set(WAVE_INTENSITY_KEY, '0'),
    ]);
  }

  console.log(
    `Glitch #${glitchCounter} (${isWave ? 'WAVE' : 'normal'}) corrupted ${pixelsAffected} pixels.`
  );
}

router.get<{}, InitResponse | { status: string; message: string }>(
  '/api/init',
  async (_req, res): Promise<void> => {
    try {
      await checkAndRunDecay();

      const username = (await reddit.getCurrentUsername()) ?? 'anonymous';
      const cooldownKey = getUserCooldownKey(username);

      const [canvasState, targetState, nextGlitchTime, cooldownEndsAtString] =
        await Promise.all([
          getCanvasState(),
          getTargetState(),
          getNextGlitchTime(),
          redis.get(cooldownKey),
        ]);

      let cooldownEndsAt = 0;
      if (cooldownEndsAtString) {
        const timestamp = parseInt(cooldownEndsAtString, 10);
        if (timestamp > Date.now()) {
          cooldownEndsAt = timestamp;
        }
      }

      const [logoCompletionPctVal, modStatus] = await Promise.all([
        calcLogoCompletionPct(canvasState, targetState),
        isCurrentUserModerator(),
      ]);

      const response: InitResponse = {
        type: 'init',
        username: username ?? 'anonymous',
        canvasState,
        targetState,
        nextGlitchTime,
        cooldownEndsAt,
        logoCompletionPct: logoCompletionPctVal,
        isModerator: modStatus,
      };

      res.json(response);
    } catch (error) {
      console.error(`API Init Error:`, error);
      res.status(400).json({ status: 'error', message: 'Initialization failed' });
    }
  }
);

router.get<{}, StatusResponse | { status: string; message: string }>(
  '/api/status',
  async (_req, res): Promise<void> => {
    try {
      await checkAndRunDecay();

      const usernameForStatus =
        (await reddit.getCurrentUsername()) ?? 'anonymous';

      const [
        integrityString,
        nextGlitchTime,
        rawStartsAt,
        rawIntensity,
        canvasState,
        targetState,
        topDefenders,
        modStatus,
        userRankInfo,
      ] = await Promise.all([
        redis.get(INTEGRITY_REDIS_KEY),
        getNextGlitchTime(),
        redis.get(WAVE_STARTS_AT_KEY),
        redis.get(WAVE_INTENSITY_KEY),
        getCanvasState(),
        getTargetState(),
        getTopDefenders(),
        isCurrentUserModerator(),
        getUserRank(usernameForStatus),
      ]);

      let integrityPct: number;
      if (integrityString) {
        integrityPct = parseFloat(integrityString);
      } else {
        integrityPct = await recalcAndPersistIntegrity();
      }

      const logoCompletionPctVal = await calcLogoCompletionPct(
        canvasState,
        targetState
      );

      const startMsNum = rawStartsAt ? parseInt(rawStartsAt, 10) : 0;
      const intensityNum = rawIntensity ? parseFloat(rawIntensity) : 0;
      const isWaveNext = startMsNum > Date.now() && intensityNum > 0;

      const activeUsers = await getActiveUsers();

      const response: StatusResponse = {
        integrityPct,
        logoCompletionPct: logoCompletionPctVal,
        nextGlitchTime,
        topDefenders,
        isWaveNext,
        waveStartsAt: isWaveNext ? startMsNum : null,
        waveIntensityPct: isWaveNext ? intensityNum : null,
        isModerator: modStatus,

        yourRank: userRankInfo.yourRank,
        yourPlaced: userRankInfo.yourPlaced,

        activeUsers,
      };

      res.json(response);
    } catch (error) {
      console.error('API Status Error:', error);
      res
        .status(500)
        .json({ status: 'error', message: 'Failed to load status' });
    }
  }
);


router.post<{}, PaintResponse | { status: string; message: string }, PaintRequest>(
  '/api/paint',
  async (req, res): Promise<void> => {
    const { x, y, color } = req.body;

    if (
      x === undefined ||
      y === undefined ||
      typeof x !== 'number' ||
      typeof y !== 'number' ||
      x < 0 ||
      y < 0 ||
      x >= CANVAS_WIDTH ||
      y >= CANVAS_HEIGHT ||
      !color ||
      typeof color !== 'string'
    ) {
      res.status(400).json({ status: 'error', message: 'Invalid pixel data' });
      return;
    }

    try {
      const username = (await reddit.getCurrentUsername()) ?? 'anonymous';
      const cooldownKey = getUserCooldownKey(username);

      const cooldownEndsAtString = await redis.get(cooldownKey);
      if (cooldownEndsAtString) {
        const timestamp = parseInt(cooldownEndsAtString, 10);
        if (timestamp > Date.now()) {
          res
            .status(429)
            .json({ status: 'error', message: 'You are on a cooldown' });
          return;
        }
      }

      const pixelData = { color, owner: username };
      const coord = `${x}:${y}`;
      const newCooldownEndsAt =
        Date.now() + USER_COOLDOWN_SECONDS * 1000;

      await Promise.all([
        redis.hSet(CANVAS_REDIS_KEY, {
          [coord]: JSON.stringify(pixelData),
        }),
        redis.set(cooldownKey, newCooldownEndsAt.toString()),
        redis.expire(cooldownKey, USER_COOLDOWN_SECONDS),
      ]);

      await incrementUserPlacement(username);

      await recalcAndPersistIntegrity();

      const activeUsers = await markUserActive(username);

      const paintPayload: PaintUpdateMessage = {
        type: 'paint',
        x,
        y,
        data: pixelData,
      };
      void realtime.send(REALTIME_CHANNEL, paintPayload);

      const presencePayload: PresenceUpdateMessage = {
        type: 'presenceUpdate',
        users: activeUsers,
      };
      void realtime.send(REALTIME_CHANNEL, presencePayload);

      res.json({
        status: 'success',
        x,
        y,
        data: pixelData,
        cooldownEndsAt: newCooldownEndsAt,
      });
    } catch (error) {
      console.error('API Paint Error:', error);
      res
        .status(500)
        .json({ status: 'error', message: 'Failed to save pixel' });
    }
  }
);


router.post<
  {},
  SetTargetResponse | { status: 'error'; message: string },
  SetTargetRequest
>('/api/set-target', async (req, res): Promise<void> => {
  try {
    const isMod = await isCurrentUserModerator();
    if (!isMod) {
      res.status(403).json({
        status: 'error',
        message: 'Only moderators can set the target blueprint.',
      });
      return;
    }

    const body = req.body;
    if (!body || !body.target || typeof body.target !== 'object') {
      res.status(400).json({
        status: 'error',
        message: 'Missing target data',
      });
      return;
    }

    const updates: Record<string, string> = {};
    let pixelCount = 0;

    const hexRegex = /^#[0-9a-fA-F]{6}$/;

    for (const [coord, color] of Object.entries(body.target)) {
      if (typeof color !== 'string' || !hexRegex.test(color)) {
        continue;
      }

      const [xs, ys] = coord.split(':');
      const x = parseInt(xs ?? '', 10);
      const y = parseInt(ys ?? '', 10);

      if (
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        x >= 0 &&
        y >= 0 &&
        x < CANVAS_WIDTH &&
        y < CANVAS_HEIGHT
      ) {
        updates[coord] = color;
        pixelCount++;
      }
    }

    if (pixelCount === 0) {
      res.status(400).json({
        status: 'error',
        message:
          'No valid pixels found in target. Use coords like "12:8" with colors like "#FF4500".',
      });
      return;
    }

    await redis.hSet(TARGET_REDIS_KEY, updates);

    const response: SetTargetResponse = {
      status: 'success',
      pixelCount,
      message: `Target updated with ${pixelCount} pixels.`,
    };
    res.json(response);
  } catch (err) {
    console.error('Error in /api/set-target:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to set target blueprint',
    });
  }
});


router.post<
  {},
  SetTargetResponse | { status: 'error'; message: string },
  SetTargetRequest
>('/internal/set-target', async (req, res): Promise<void> => {
  try {
    const isMod = await isCurrentUserModerator();
    if (!isMod) {
      res.status(403).json({
        status: 'error',
        message: 'Only moderators can set the target blueprint.',
      });
      return;
    }

    const body = req.body;
    if (!body || !body.target || typeof body.target !== 'object') {
      res
        .status(400)
        .json({ status: 'error', message: 'Missing target data' });
      return;
    }

    const updates: Record<string, string> = {};
    let pixelCount = 0;

    const hexRegex = /^#[0-9a-fA-F]{6}$/;
    for (const [coord, color] of Object.entries(body.target)) {
      if (typeof color !== 'string' || !hexRegex.test(color)) {
        continue;
      }

      const [xs, ys] = coord.split(':');
      const x = parseInt(xs ?? '', 10);
      const y = parseInt(ys ?? '', 10);

      if (
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        x >= 0 &&
        y >= 0 &&
        x < CANVAS_WIDTH &&
        y < CANVAS_HEIGHT
      ) {
        updates[coord] = color;
        pixelCount++;
      }
    }

    if (pixelCount === 0) {
      res.status(400).json({
        status: 'error',
        message:
          'No valid pixels found in target. Please ensure coords like "12:8" map to hex colors like "#FF4500".',
      });
      return;
    }

    await redis.hSet(TARGET_REDIS_KEY, updates);

    const response: SetTargetResponse = {
      status: 'success',
      pixelCount,
      message: `Target updated with ${pixelCount} pixels.`,
    };
    res.json(response);
  } catch (err) {
    console.error('Error in /internal/set-target:', err);
    res
      .status(500)
      .json({ status: 'error', message: 'Failed to set target blueprint' });
  }
});

router.post('/internal/on-app-install', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();
    res.json({
      status: 'success',
      message: `Post created in subreddit ${context.subredditName} with id ${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({ status: 'error', message: 'Failed to create post' });
  }
});

router.post('/internal/menu/post-create', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();
    res.json({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({ status: 'error', message: 'Failed to create post' });
  }
});

app.use(router);

const port = getServerPort();
const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port);
